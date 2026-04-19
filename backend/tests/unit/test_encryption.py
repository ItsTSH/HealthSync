"""
Test suite for encryption service.

Tests AES-256-GCM encryption/decryption for PII protection.
"""
import pytest
import os
from services.encryption import EncryptionService, EncryptionKeyManager, generate_encryption_keys_for_env


@pytest.fixture
def key_manager():
    """Create encryption key manager for testing"""
    # Set test environment
    os.environ['ENVIRONMENT'] = 'dev'
    return EncryptionKeyManager(environment='dev')


@pytest.fixture
def encryption_service(key_manager):
    """Create encryption service for testing"""
    return EncryptionService(key_manager)


class TestEncryptionKeyManager:
    """Test encryption key manager"""
    
    def test_key_manager_loads_dev_keys(self):
        """Key manager should generate ephemeral keys for dev"""
        os.environ['ENVIRONMENT'] = 'dev'
        manager = EncryptionKeyManager(environment='dev')
        
        assert manager.patient_name_key is not None
        assert len(manager.patient_name_key) == 32  # 256 bits
        assert manager.original_text_key is not None
        assert len(manager.original_text_key) == 32
    
    def test_key_manager_different_keys_generated(self):
        """Each key should be unique"""
        os.environ['ENVIRONMENT'] = 'dev'
        manager1 = EncryptionKeyManager(environment='dev')
        manager2 = EncryptionKeyManager(environment='dev')
        
        # Keys should be different (each initialization generates new ephemeral keys)
        assert manager1.patient_name_key != manager2.patient_name_key


class TestPatientNameEncryption:
    """Test patient name encryption/decryption"""
    
    @pytest.mark.asyncio
    async def test_encrypt_decrypt_patient_name(self, encryption_service):
        """Should encrypt and decrypt patient name correctly"""
        plaintext = "John Smith"
        
        # Encrypt
        encrypted = encryption_service.encrypt_patient_name(plaintext)
        
        # Verify it's not plaintext
        assert encrypted != plaintext.encode()
        assert len(encrypted) > len(plaintext)  # Should be larger due to IV + tag
        
        # Decrypt
        decrypted = encryption_service.decrypt_patient_name(encrypted)
        assert decrypted == plaintext
    
    @pytest.mark.asyncio
    async def test_encrypt_various_patient_names(self, encryption_service):
        """Should handle various patient names"""
        names = [
            "John Smith",
            "María García",
            "李明",  # Chinese characters
            "O'Brien",  # Special characters
            "Jean-Claude",  # Hyphenated
        ]
        
        for name in names:
            encrypted = encryption_service.encrypt_patient_name(name)
            decrypted = encryption_service.decrypt_patient_name(encrypted)
            assert decrypted == name
    
    @pytest.mark.asyncio
    async def test_different_plaintexts_different_ciphertexts(self, encryption_service):
        """Different names should produce different ciphertexts"""
        name1 = "John Smith"
        name2 = "Jane Doe"
        
        enc1 = encryption_service.encrypt_patient_name(name1)
        enc2 = encryption_service.encrypt_patient_name(name2)
        
        assert enc1 != enc2
    
    @pytest.mark.asyncio
    async def test_same_plaintext_different_ciphertexts(self, encryption_service):
        """
        Same plaintext encrypted twice should produce different ciphertexts.
        This is expected due to random IV.
        """
        plaintext = "John Smith"
        
        enc1 = encryption_service.encrypt_patient_name(plaintext)
        enc2 = encryption_service.encrypt_patient_name(plaintext)
        
        # Should be different due to random IV
        assert enc1 != enc2
        
        # But both should decrypt to same plaintext
        assert encryption_service.decrypt_patient_name(enc1) == plaintext
        assert encryption_service.decrypt_patient_name(enc2) == plaintext
    
    @pytest.mark.asyncio
    async def test_tampered_ciphertext_fails(self, encryption_service):
        """Tampered ciphertext should fail authentication"""
        plaintext = "John Smith"
        encrypted = encryption_service.encrypt_patient_name(plaintext)
        
        # Tamper with the ciphertext (flip a bit in the middle)
        tampered = bytearray(encrypted)
        tampered[20] ^= 0xFF  # Flip all bits in one byte
        tampered = bytes(tampered)
        
        # Decryption should fail due to authentication tag mismatch
        with pytest.raises(ValueError, match="Decryption failed"):
            encryption_service.decrypt_patient_name(tampered)
    
    @pytest.mark.asyncio
    async def test_wrong_key_fails_decryption(self, encryption_service):
        """Decryption with wrong key should fail"""
        plaintext = "John Smith"
        encrypted = encryption_service.encrypt_patient_name(plaintext)
        
        # Create a service with different key
        different_key_manager = EncryptionKeyManager(environment='dev')
        different_service = EncryptionService(different_key_manager)
        
        # Decryption with wrong key should fail
        with pytest.raises(ValueError, match="Decryption failed"):
            different_service.decrypt_patient_name(encrypted)


class TestOriginalTextEncryption:
    """Test original note text encryption/decryption"""
    
    @pytest.mark.asyncio
    async def test_encrypt_decrypt_original_text(self, encryption_service):
        """Should encrypt and decrypt original text correctly"""
        plaintext = "Patient presented with elevated blood pressure (160/90 mmHg)"
        
        encrypted = encryption_service.encrypt_original_text(plaintext)
        decrypted = encryption_service.decrypt_original_text(encrypted)
        
        assert decrypted == plaintext
    
    @pytest.mark.asyncio
    async def test_encrypt_long_original_text(self, encryption_service):
        """Should handle long note text"""
        plaintext = """
        Patient: John Smith, DOB: 01/15/1980
        Chief Complaint: Elevated blood pressure and chest discomfort
        History of Present Illness:
        Patient presents to clinic with complaints of elevated blood pressure 
        and occasional chest discomfort over the past week. Patient denies 
        shortness of breath, nausea, or radiating pain.
        
        Physical Examination:
        BP: 160/90 mmHg
        HR: 88 bpm
        RR: 16 bpm
        
        Assessment & Plan:
        1. Hypertension - Continue current medication, recheck in 2 weeks
        2. Rule out cardiac cause - Refer for EKG and cardiology consult
        """ * 5  # Make it long
        
        encrypted = encryption_service.encrypt_original_text(plaintext)
        decrypted = encryption_service.decrypt_original_text(encrypted)
        
        assert decrypted == plaintext


class TestEncryptionKeyGeneration:
    """Test encryption key generation utility"""
    
    def test_generate_encryption_keys(self):
        """Should generate valid base64-encoded keys"""
        import base64
        
        keys = generate_encryption_keys_for_env()
        
        assert 'ENCRYPTION_KEY_PATIENT_NAME' in keys
        assert 'ENCRYPTION_KEY_ORIGINAL_TEXT' in keys
        
        # Should be base64-encoded
        patient_name_key = base64.b64decode(keys['ENCRYPTION_KEY_PATIENT_NAME'])
        original_text_key = base64.b64decode(keys['ENCRYPTION_KEY_ORIGINAL_TEXT'])
        
        # Should be 32 bytes (256 bits)
        assert len(patient_name_key) == 32
        assert len(original_text_key) == 32
        
        # Keys should be different
        assert patient_name_key != original_text_key


class TestEncryptionErrorHandling:
    """Test error handling in encryption service"""
    
    @pytest.mark.asyncio
    async def test_invalid_encrypted_data_fails(self, encryption_service):
        """Invalid encrypted data should fail"""
        with pytest.raises(ValueError, match="Decryption failed"):
            encryption_service.decrypt_patient_name(b"not_valid_encrypted_data")
    
    @pytest.mark.asyncio
    async def test_empty_encrypted_data_fails(self, encryption_service):
        """Empty data should fail"""
        with pytest.raises(ValueError, match="Decryption failed"):
            encryption_service.decrypt_patient_name(b"")


class TestEncryptionIsolation:
    """Test that encryption keys are properly isolated"""
    
    def test_patient_name_key_independent(self, encryption_service):
        """Patient name and original text keys should be independent"""
        # Both services share key manager but use different keys
        assert encryption_service.key_manager.patient_name_key != encryption_service.key_manager.original_text_key
    
    def test_key_sizes_correct(self, encryption_service):
        """Keys should be correct size (256 bits = 32 bytes)"""
        assert len(encryption_service.key_manager.patient_name_key) == 32
        assert len(encryption_service.key_manager.original_text_key) == 32


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
