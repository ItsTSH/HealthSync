"""
Comprehensive test suite for enhanced PII masking service v3.1.

Tests deterministic token generation, masking confidence, PII leak detection,
and token restoration from combined token maps.
"""
import pytest
import os
from services.pii_masking import (
    PIITokenGenerator,
    PIILeakDetector,
    PIIMaskingService,
    MaskingResult
)


@pytest.fixture
def token_generator():
    """Create token generator for testing"""
    return PIITokenGenerator(salt=b"test_salt_32_bytes_long_enough_123")


@pytest.fixture
def leak_detector():
    """Create leak detector for testing"""
    return PIILeakDetector()


@pytest.fixture
def masking_service():
    """Create masking service for testing"""
    service = PIIMaskingService()
    # Override salt for testing
    service.token_generator = PIITokenGenerator(salt=b"test_salt_32_bytes_long_enough_123")
    return service


class TestPIITokenGenerator:
    """Test deterministic PII token generation"""
    
    def test_generate_patient_token_deterministic(self, token_generator):
        """Same patient should generate same token"""
        user_id = "user_123"
        patient_id = "patient_456"
        
        token1 = token_generator.generate_patient_token(user_id, patient_id)
        token2 = token_generator.generate_patient_token(user_id, patient_id)
        
        assert token1 == token2
        assert token1.startswith("<PATIENT_")
        assert token1.endswith(">")
        assert len(token1) == len("<PATIENT_xxxxxx>")
    
    def test_generate_patient_tokens_different_for_different_patients(self, token_generator):
        """Different patients should generate different tokens"""
        user_id = "user_123"
        patient_id_1 = "patient_456"
        patient_id_2 = "patient_789"
        
        token1 = token_generator.generate_patient_token(user_id, patient_id_1)
        token2 = token_generator.generate_patient_token(user_id, patient_id_2)
        
        assert token1 != token2
    
    def test_generate_doctor_token_deterministic(self, token_generator):
        """Same doctor should generate same token"""
        doctor_id = "doctor_123"
        
        token1 = token_generator.generate_doctor_token(doctor_id)
        token2 = token_generator.generate_doctor_token(doctor_id)
        
        assert token1 == token2
        assert token1.startswith("<DOCTOR_")
    
    def test_token_format_valid(self, token_generator):
        """Tokens should match expected format"""
        import re
        user_id = "user_123"
        patient_id = "patient_456"
        doctor_id = "doctor_123"
        
        patient_token = token_generator.generate_patient_token(user_id, patient_id)
        doctor_token = token_generator.generate_doctor_token(doctor_id)
        
        patient_pattern = r'^<PATIENT_[a-f0-9]{6}>$'
        doctor_pattern = r'^<DOCTOR_[a-f0-9]{6}>$'
        
        assert re.match(patient_pattern, patient_token)
        assert re.match(doctor_pattern, doctor_token)
    
    def test_validate_token_format(self, token_generator):
        """Test token format validation"""
        valid_token = "<PATIENT_abc123>"
        invalid_tokens = [
            "PATIENT_abc123",  # Missing brackets
            "<PATIENT_ABC123>",  # Wrong case
            "<PATIENT_abc12>",  # Too short
            "<PATIENT_abc1234>",  # Too long
            "<INVALID_abc123>",  # Wrong type
        ]
        
        assert PIITokenGenerator.validate_token_format(valid_token)
        for invalid in invalid_tokens:
            assert not PIITokenGenerator.validate_token_format(invalid)


class TestPIILeakDetector:
    """Test PII leak detection"""
    
    def test_detect_ssn(self, leak_detector):
        """Should detect SSN format"""
        text = "Patient SSN: 123-45-6789"
        leaks = leak_detector.detect_leaks(text)
        
        assert len(leaks) > 0
        ssn_leaks = [l for l in leaks if l['type'] == 'SSN']
        assert len(ssn_leaks) > 0
        assert ssn_leaks[0]['confidence'] > 0.9
    
    def test_detect_phone(self, leak_detector):
        """Should detect phone numbers"""
        texts = [
            "Call me at 555-1234",
            "Phone: (555) 123-4567",
            "555.123.4567",
        ]
        
        for text in texts:
            leaks = leak_detector.detect_leaks(text)
            assert any(l['type'] == 'PHONE' for l in leaks)
    
    def test_detect_email(self, leak_detector):
        """Should detect email addresses"""
        text = "Contact: john@example.com"
        leaks = leak_detector.detect_leaks(text)
        
        assert len(leaks) > 0
        email_leaks = [l for l in leaks if l['type'] == 'EMAIL']
        assert len(email_leaks) > 0
    
    def test_detect_credit_card(self, leak_detector):
        """Should detect credit card numbers"""
        text = "Card: 4532-1234-5678-9010"
        leaks = leak_detector.detect_leaks(text)
        
        assert len(leaks) > 0
        cc_leaks = [l for l in leaks if l['type'] == 'CREDIT_CARD']
        assert len(cc_leaks) > 0


class TestPIIMaskingService:
    """Test comprehensive PII masking service"""
    
    @pytest.mark.asyncio
    async def test_mask_note_basic(self, masking_service):
        """Basic note masking"""
        note = "Patient John Smith presents with chest pain. Examined by Dr. Jane Doe."
        
        result = await masking_service.mask_note(
            note_text=note,
            patient_id="patient_123",
            doctor_id="doctor_456",
            user_id="user_789"
        )
        
        assert isinstance(result, MaskingResult)
        assert "masked_text" in result.__dict__
        assert "token_map" in result.__dict__
        assert "masking_confidence" in result.__dict__
        assert 0.0 <= result.masking_confidence <= 1.0
        
        # Masked text should not contain real names
        assert "John Smith" not in result.masked_text
        assert "Jane Doe" not in result.masked_text
    
    @pytest.mark.asyncio
    async def test_mask_multiple_pii_types(self, masking_service):
        """Mask multiple PII types"""
        note = """Patient John Smith (DOB: 01/15/1980, SSN: 123-45-6789)
                  Email: john@example.com
                  Phone: 555-1234
                  Address: 123 Main St, New York
                  presents with symptoms"""
        
        result = await masking_service.mask_note(
            note_text=note,
            patient_id="patient_123",
            doctor_id="doctor_456",
            user_id="user_789"
        )
        
        masked = result.masked_text
        
        # Check that various PII types are masked
        assert "John Smith" not in masked or "<PATIENT_" in masked
        assert "123-45-6789" not in masked or "[SSN]" in masked
        assert "john@example.com" not in masked or "[EMAIL]" in masked
    
    @pytest.mark.asyncio
    async def test_masking_confidence_high_for_clear_pii(self, masking_service):
        """High masking confidence for clear PII"""
        note = "Dr. Jane Doe treated John Smith"
        
        result = await masking_service.mask_note(
            note_text=note,
            patient_id="patient_123",
            doctor_id="doctor_456",
            user_id="user_789"
        )
        
        # Should have high confidence for clear names
        assert result.masking_confidence > 0.7
    
    @pytest.mark.asyncio
    async def test_token_map_contains_mappings(self, masking_service):
        """Token map should contain token-to-name mappings"""
        note = "Patient John Smith examined by Dr. Jane Doe"
        
        result = await masking_service.mask_note(
            note_text=note,
            patient_id="patient_123",
            doctor_id="doctor_456",
            user_id="user_789"
        )
        
        assert len(result.token_map) > 0
        
        # All keys should be valid tokens
        for token in result.token_map.keys():
            assert PIITokenGenerator.validate_token_format(token)
    
    @pytest.mark.asyncio
    async def test_failed_masks_tracked(self, masking_service):
        """Failed masks should be tracked"""
        note = "Just a simple note"  # No clear names
        
        result = await masking_service.mask_note(
            note_text=note,
            patient_id="patient_123",
            doctor_id="doctor_456",
            user_id="user_789"
        )
        
        # May have failed masks due to ambiguous patterns
        assert isinstance(result.failed_masks, list)
    
    @pytest.mark.asyncio
    async def test_unmask_response_basic(self, masking_service):
        """Test token restoration"""
        masked_response = "Based on <PATIENT_a2f5c7>'s notes, <DOCTOR_b3e8d2> found..."
        
        token_map = {
            "<PATIENT_a2f5c7>": "John Smith",
            "<DOCTOR_b3e8d2>": "Dr. Jane Doe"
        }
        
        result = await masking_service.unmask_response(masked_response, token_map)
        unmasked = result["unmasked_response"]
        
        assert "John Smith" in unmasked
        assert "Dr. Jane Doe" in unmasked
        assert "<PATIENT_" not in unmasked
        assert "<DOCTOR_" not in unmasked
    
    @pytest.mark.asyncio
    async def test_unmask_response_leak_detection(self, masking_service):
        """Leak detection in unmasked response"""
        masked_response = "Based on <PATIENT_a2f5c7>'s SSN: 123-45-6789"  # Contains PII
        
        token_map = {
            "<PATIENT_a2f5c7>": "John Smith"
        }
        
        result = await masking_service.unmask_response(masked_response, token_map)
        
        # Should detect the SSN leak
        assert result["has_pii_leaks"] or len(result["leaks_detected"]) > 0
    
    def test_detect_pii_leaks(self, masking_service):
        """Direct leak detection"""
        text_with_pii = "SSN: 123-45-6789, Email: test@example.com"
        
        leaks = masking_service.detect_pii_leaks(text_with_pii)
        
        assert len(leaks) > 0
        leak_types = [l['type'] for l in leaks]
        assert 'SSN' in leak_types or 'EMAIL' in leak_types


class TestMaskingResult:
    """Test masking result dataclass"""
    
    def test_masking_result_creation(self):
        """Should create valid MaskingResult"""
        result = MaskingResult(
            masked_text="Masked text here",
            token_map={"<PATIENT_123>": "John Smith"},
            masking_confidence=0.95,
            failed_masks=[]
        )
        
        assert result.masked_text == "Masked text here"
        assert "<PATIENT_123>" in result.token_map
        assert result.masking_confidence == 0.95
        assert result.failed_masks == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
