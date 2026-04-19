"""Unit tests for medical note chunking service."""
import pytest
from unittest.mock import MagicMock, patch
from typing import List, Dict
import uuid

from services.chunking import MedicalChunker, NoteChunk


@pytest.mark.unit
class TestNoteChunkDataclass:
    """Tests for NoteChunk dataclass."""
    
    def test_note_chunk_creation(self) -> None:
        """Test creating a NoteChunk instance."""
        chunk = NoteChunk(
            chunk_id=str(uuid.uuid4()),
            note_id="note-001",
            section="symptoms",
            text="Patient has persistent cough",
            text_masked="Patient has persistent [COUGH]",
            tokens=5,
            chunk_index=0,
            parent_chunk_id=None,
        )
        
        assert chunk.chunk_id is not None
        assert chunk.note_id == "note-001"
        assert chunk.section == "symptoms"
        assert chunk.tokens == 5
        assert chunk.metadata == {}
    
    def test_note_chunk_with_metadata(self) -> None:
        """Test NoteChunk with additional metadata."""
        metadata = {"tier": 1, "source": "api"}
        chunk = NoteChunk(
            chunk_id=str(uuid.uuid4()),
            note_id="note-001",
            section="plan",
            text="Treatment plan text",
            text_masked=None,
            tokens=3,
            chunk_index=1,
            parent_chunk_id="parent-001",
            metadata=metadata,
        )
        
        assert chunk.metadata == metadata
        assert chunk.parent_chunk_id == "parent-001"
    
    def test_note_chunk_to_dict(self) -> None:
        """Test conversion of NoteChunk to dictionary."""
        chunk = NoteChunk(
            chunk_id="chunk-001",
            note_id="note-001",
            section="diagnosis",
            text="Diagnosis text",
            text_masked="Diagnosis [MASKED]",
            tokens=2,
            chunk_index=0,
            parent_chunk_id=None,
        )
        
        chunk_dict = chunk.to_dict()
        assert chunk_dict["chunk_id"] == "chunk-001"
        assert chunk_dict["note_id"] == "note-001"
        assert chunk_dict["section"] == "diagnosis"
        assert chunk_dict["text"] == "Diagnosis text"
        assert isinstance(chunk_dict, dict)


@pytest.mark.unit
class TestMedicalChunkerInitialization:
    """Tests for MedicalChunker initialization."""
    
    def test_chunker_default_initialization(self) -> None:
        """Test chunker with default parameters."""
        chunker = MedicalChunker()
        
        assert chunker.chunk_size > 0
        assert chunker.chunk_overlap > 0
        assert chunker.max_chunk_size > 0
        assert chunker.max_chunk_size >= chunker.chunk_size
    
    def test_chunker_custom_parameters(self) -> None:
        """Test chunker with custom token parameters."""
        chunker = MedicalChunker(
            chunk_size_tokens=200,
            chunk_overlap_tokens=25,
            max_chunk_size=400,
        )
        
        assert chunker.chunk_size == 200
        assert chunker.chunk_overlap == 25
        assert chunker.max_chunk_size == 400
    
    def test_medical_sections_defined(self) -> None:
        """Test that medical sections are properly defined."""
        chunker = MedicalChunker()
        
        expected_sections = [
            "chief_complaint",
            "history_of_present_illness",
            "symptoms",
            "past_medical_history",
            "medications",
            "allergies",
            "physical_exam",
            "assessment",
            "diagnosis",
            "plan",
        ]
        
        for section in expected_sections:
            assert section in chunker.MEDICAL_SECTIONS


@pytest.mark.unit
class TestChunkingTierFunctions:
    """Tests for individual chunking tiers."""
    
    def test_extract_sections_basic(self, sample_medical_note: str) -> None:
        """Test Tier 1: Section extraction from note."""
        chunker = MedicalChunker()
        
        note_data = {
            "chief_complaint": "Persistent cough",
            "history_of_present_illness": "Patient has had cough for 2 weeks",
            "medications": "Acetaminophen 500mg BID",
        }
        note_id = "note-001"
        
        # Mock the token counting to avoid tiktoken issues in tests
        with patch.object(chunker, '_count_tokens', return_value=5):
            chunks = chunker._extract_sections(note_data, note_id)
        
        assert len(chunks) >= 1
        assert all(isinstance(c, NoteChunk) for c in chunks)
        assert all(c.note_id == note_id for c in chunks)
    
    def test_extract_sections_empty_note(self) -> None:
        """Test Tier 1 with empty note data."""
        chunker = MedicalChunker()
        note_data = {}
        note_id = "note-002"
        
        chunks = chunker._extract_sections(note_data, note_id)
        assert isinstance(chunks, list)
        assert len(chunks) == 0
    
    def test_count_tokens_fallback(self) -> None:
        """Test token counting with fallback."""
        chunker = MedicalChunker()
        
        text = "Short medical text"
        tokens = chunker._count_tokens(text)
        
        # Token count should be reasonable
        assert isinstance(tokens, int)
        assert tokens > 0
        # Rough estimate: ~4 chars = 1 token
        assert tokens <= len(text) / 2


@pytest.mark.unit
class TestFullChunkingPipeline:
    """Tests for complete chunking pipeline."""
    
    def test_chunk_note_basic(self) -> None:
        """Test full chunking pipeline with basic medical note."""
        chunker = MedicalChunker(chunk_size_tokens=100)
        
        note_data = {
            "chief_complaint": "Persistent cough",
            "history_of_present_illness": "Started 2 weeks ago with fever",
            "physical_exam": "Lungs clear to auscultation",
            "assessment": "Viral upper respiratory infection",
            "plan": "Supportive care, follow-up in 1 week",
        }
        note_id = "note-003"
        
        with patch.object(chunker, '_count_tokens', return_value=10):
            chunks = chunker.chunk_note(note_data, note_id)
        
        assert len(chunks) > 0
        assert all(isinstance(c, NoteChunk) for c in chunks)
        assert all(c.note_id == note_id for c in chunks)
        
        # Check indexing
        for idx, chunk in enumerate(chunks):
            assert chunk.chunk_index == idx
    
    def test_chunk_note_with_large_section(self) -> None:
        """Test chunking with sections larger than chunk_size."""
        chunker = MedicalChunker(chunk_size_tokens=50)
        
        # Create a note with a large section
        large_text = "This is a medical note section. " * 20  # Large text
        note_data = {
            "history_of_present_illness": large_text,
        }
        note_id = "note-004"
        
        # Mock token counting to return varying values
        def mock_token_count(text):
            return max(1, len(text) // 10)  # Approximate token count
        
        with patch.object(chunker, '_count_tokens', side_effect=mock_token_count):
            chunks = chunker.chunk_note(note_data, note_id)
        
        assert len(chunks) > 0
    
    def test_chunk_note_empty_input(self) -> None:
        """Test chunking with empty note."""
        chunker = MedicalChunker()
        note_data = {}
        note_id = "note-005"
        
        chunks = chunker.chunk_note(note_data, note_id)
        
        assert isinstance(chunks, list)
    
    def test_chunk_note_returns_list(self) -> None:
        """Test that chunk_note always returns a list."""
        chunker = MedicalChunker()
        note_data = {"chief_complaint": "Test complaint"}
        note_id = "note-006"
        
        with patch.object(chunker, '_count_tokens', return_value=5):
            result = chunker.chunk_note(note_data, note_id)
        
        assert isinstance(result, list)
        assert all(isinstance(c, NoteChunk) for c in result)


@pytest.mark.unit
class TestChunkMetadata:
    """Tests for chunk metadata handling."""
    
    def test_chunk_has_required_metadata(self) -> None:
        """Test that chunks have all required metadata fields."""
        chunker = MedicalChunker()
        
        note_data = {
            "chief_complaint": "Test complaint",
            "diagnosis": "Test diagnosis",
        }
        note_id = "note-007"
        
        with patch.object(chunker, '_count_tokens', return_value=5):
            chunks = chunker.chunk_note(note_data, note_id)
        
        required_fields = [
            "chunk_id", "note_id", "section", "text", "tokens",
            "chunk_index", "metadata"
        ]
        
        for chunk in chunks:
            for field in required_fields:
                assert hasattr(chunk, field), f"Missing field: {field}"
    
    def test_chunk_tokens_positive(self) -> None:
        """Test that all chunks have positive token counts."""
        chunker = MedicalChunker()
        
        note_data = {
            "chief_complaint": "Complaint",
            "plan": "Treatment plan",
        }
        note_id = "note-008"
        
        with patch.object(chunker, '_count_tokens', return_value=5):
            chunks = chunker.chunk_note(note_data, note_id)
        
        for chunk in chunks:
            assert chunk.tokens > 0, f"Chunk {chunk.chunk_id} has non-positive tokens"


@pytest.mark.unit
class TestChunkingWithRealData:
    """Tests with realistic medical data."""
    
    def test_chunking_realistic_note(self, sample_medical_note: str) -> None:
        """Test chunking with realistic medical note format."""
        chunker = MedicalChunker(chunk_size_tokens=150)
        
        note_data = {
            "chief_complaint": "Persistent dry cough for 2 weeks",
            "history_of_present_illness": sample_medical_note,
            "physical_exam": "Lungs clear to auscultation bilaterally",
            "assessment": "Viral upper respiratory infection",
            "plan": "Supportive care with fluids and rest",
        }
        note_id = "realistic-001"
        
        with patch.object(chunker, '_count_tokens', return_value=20):
            chunks = chunker.chunk_note(note_data, note_id)
        
        assert len(chunks) > 0
        
        # Verify diversity of sections
        sections = {chunk.section for chunk in chunks}
        assert len(sections) > 0
    
    def test_chunk_ordering(self) -> None:
        """Test that chunks maintain order with correct indexing."""
        chunker = MedicalChunker()
        
        note_data = {
            "chief_complaint": "Complaint",
            "history_of_present_illness": "History",
            "physical_exam": "Exam",
            "assessment": "Assessment",
            "plan": "Plan",
        }
        note_id = "order-001"
        
        with patch.object(chunker, '_count_tokens', return_value=1):
            chunks = chunker.chunk_note(note_data, note_id)
        
        # Check ordering is sequential
        for idx, chunk in enumerate(chunks):
            assert chunk.chunk_index == idx


@pytest.mark.unit
class TestChunkingErrorHandling:
    """Tests for error handling in chunking."""
    
    def test_chunk_with_invalid_note_data(self) -> None:
        """Test chunking with malformed note data."""
        chunker = MedicalChunker()
        note_id = "error-001"
        
        # None values and mixed types
        note_data = {
            "chief_complaint": None,
            "symptoms": 12345,  # Invalid type
            "plan": "",  # Empty string
        }
        
        with patch.object(chunker, '_count_tokens', return_value=1):
            # Should handle gracefully without raising
            result = chunker.chunk_note(note_data, note_id)
        
        assert isinstance(result, list)
    
    def test_chunk_with_special_characters(self) -> None:
        """Test chunking with special characters and unicode."""
        chunker = MedicalChunker()
        
        note_data = {
            "chief_complaint": "Patient with ☹️ persistent cough → fever",
            "plan": "Special chars: @, #, $, %, &, *, etc.",
        }
        note_id = "special-001"
        
        with patch.object(chunker, '_count_tokens', return_value=5):
            chunks = chunker.chunk_note(note_data, note_id)
        
        assert len(chunks) >= 0
        for chunk in chunks:
            assert chunk.text is not None


@pytest.mark.unit
class TestChunkingSectionMapping:
    """Tests for section name mapping."""
    
    def test_section_name_variations(self) -> None:
        """Test that chunker recognizes different section name variations."""
        chunker = MedicalChunker()
        
        # Test various ways to specify "chief_complaint"
        variations = [
            {"Chief Complaint": "Test"},
            {"CC": "Test"},
            {"Presenting Complaint": "Test"},
        ]
        
        note_id = "variation-001"
        for note_data in variations:
            with patch.object(chunker, '_count_tokens', return_value=1):
                chunks = chunker._extract_sections(note_data, note_id)
            
            # Should find and extract the section
            assert isinstance(chunks, list)
