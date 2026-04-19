"""Advanced hierarchical chunking engine for medical notes

Implements 4-tier chunking strategy:
1. Section extraction (chief complaint, symptoms, diagnosis, etc.)
2. Sub-chunking (split large sections by token count)
3. Context windows (add neighboring chunks for context)
4. Deduplication (remove duplicate chunks within note)
"""
import logging
import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import tiktoken

from core.config import (
    CHUNK_SIZE_TOKENS,
    CHUNK_OVERLAP_TOKENS,
    MAX_CHUNK_SIZE_TOKENS,
)

logger = logging.getLogger(__name__)

# Initialize tiktoken for accurate token counting
try:
    tokenizer = tiktoken.get_encoding("cl100k_base")  # GPT-4 tokenizer
except Exception as e:
    logger.warning(f"Could not initialize tiktoken: {e}. Using fallback.")
    tokenizer = None


@dataclass
class NoteChunk:
    """Single chunk of medical note with metadata"""
    chunk_id: str  # Unique identifier (uuid)
    note_id: str  # Reference to original note
    section: str  # Medical section (symptoms, medications, etc.)
    text: str  # Actual chunk content
    text_masked: Optional[str]  # PII-masked version (set later)
    tokens: int  # Token count
    chunk_index: int  # Position in note (0-based)
    parent_chunk_id: Optional[str]  # For hierarchical tracking
    metadata: Dict = None  # Additional metadata
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization"""
        data = asdict(self)
        data['text'] = self.text
        data['tokens'] = self.tokens
        return data


class MedicalChunker:
    """
    4-tier hierarchical chunker for medical notes.
    
    Optimized for RAG with medical field awareness and proper context windows.
    """
    
    # Medical sections in notes (used for Tier 1 section extraction)
    MEDICAL_SECTIONS = {
        "chief_complaint": ["Chief Complaint", "CC", "Presenting Complaint"],
        "history_of_present_illness": ["HPI", "History of Present Illness", "History"],
        "symptoms": ["Symptoms", "Symptom", "Complaints"],
        "past_medical_history": ["PMH", "Past Medical History"],
        "medications": ["Current Medications", "Medication", "Medications"],
        "allergies": ["Allergies", "Allergic Reactions"],
        "physical_exam": ["Physical Examination", "PE", "Exam Findings"],
        "assessment": ["Assessment", "Impression"],
        "diagnosis": ["Diagnosis", "Diagnoses", "Previous Diagnoses"],
        "plan": ["Plan", "Treatment Plan", "Recommendations"],
    }
    
    def __init__(
        self,
        chunk_size_tokens: int = CHUNK_SIZE_TOKENS,
        chunk_overlap_tokens: int = CHUNK_OVERLAP_TOKENS,
        max_chunk_size: int = MAX_CHUNK_SIZE_TOKENS,
    ):
        """
        Initialize chunker with token budgets.
        
        Args:
            chunk_size_tokens: Target chunk size in tokens (default 300)
            chunk_overlap_tokens: Overlap between chunks (default 50)
            max_chunk_size: Hard limit on chunk size (default 500)
        """
        self.chunk_size = chunk_size_tokens
        self.chunk_overlap = chunk_overlap_tokens
        self.max_chunk_size = max_chunk_size
    
    def chunk_note(self, note_data: Dict, note_id: str) -> List[NoteChunk]:
        """
        Process note through 4-tier chunking system.
        
        Args:
            note_data: Dictionary with medical note fields
            note_id: UUID of the note
            
        Returns:
            List of NoteChunk objects with all metadata
        """
        logger.info(f"Starting 4-tier chunking for note {note_id}")
        
        try:
            # TIER 1: Section extraction
            section_chunks = self._extract_sections(note_data, note_id)
            logger.info(f"Tier 1: Extracted {len(section_chunks)} sections")
            
            # TIER 2: Sub-chunking (split large sections by tokens)
            subchunks = self._create_subchunks(section_chunks)
            logger.info(f"Tier 2: Created {len(subchunks)} sub-chunks")
            
            # TIER 3: Context windows (add neighboring chunks reference)
            context_chunks = self._add_context_windows(subchunks)
            logger.info(f"Tier 3: Added context windows to {len(context_chunks)} chunks")
            
            # TIER 4: Deduplication
            final_chunks = self._deduplicate_chunks(context_chunks)
            logger.info(f"Tier 4: Deduplication reduced to {len(final_chunks)} chunks")
            
            # Assign final indexes
            for idx, chunk in enumerate(final_chunks):
                chunk.chunk_index = idx
            
            logger.info(f"✅ Chunking complete for note {note_id}: {len(final_chunks)} chunks")
            return final_chunks
            
        except Exception as e:
            logger.error(f"Error chunking note {note_id}: {str(e)}", exc_info=True)
            raise
    
    def _extract_sections(self, note_data: Dict, note_id: str) -> List[NoteChunk]:
        """
        TIER 1: Extract medical sections from note.
        
        Maps note fields to medical sections and creates chunks for each.
        """
        import uuid
        chunks = []
        
        for section_key, note_fields in self.MEDICAL_SECTIONS.items():
            # Try to find matching field in note_data
            field_value = None
            for field in note_fields:
                # Try snake_case and camelCase variants
                snake_key = field.lower().replace(" ", "_")
                camel_key = field[0].lower() + field[1:].replace(" ", "")
                
                if snake_key in note_data and note_data[snake_key]:
                    field_value = note_data[snake_key]
                    break
                elif camel_key in note_data and note_data[camel_key]:
                    field_value = note_data[camel_key]
                    break
            
            # If found, create chunk for this section
            if field_value:
                chunk_id = str(uuid.uuid4())
                tokens = self._count_tokens(str(field_value))
                
                chunk = NoteChunk(
                    chunk_id=chunk_id,
                    note_id=note_id,
                    section=section_key,
                    text=str(field_value),
                    text_masked=None,
                    tokens=tokens,
                    chunk_index=len(chunks),
                    parent_chunk_id=None,
                    metadata={"tier": 1, "source_field": field}
                )
                chunks.append(chunk)
                logger.debug(f"Section {section_key}: {tokens} tokens")
        
        return chunks
    
    def _create_subchunks(self, section_chunks: List[NoteChunk]) -> List[NoteChunk]:
        """
        TIER 2: Split large sections into sub-chunks based on token count.
        
        Sections larger than chunk_size are split recursively.
        """
        import uuid
        new_chunks = []
        
        for chunk in section_chunks:
            # If chunk is small enough, keep as-is
            if chunk.tokens <= self.chunk_size:
                new_chunks.append(chunk)
                continue
            
            # Split large chunk
            logger.debug(f"Splitting large chunk {chunk.section} ({chunk.tokens} tokens)")
            sub_chunks = self._split_text_by_tokens(
                text=chunk.text,
                section=chunk.section,
                parent_id=chunk.chunk_id,
                note_id=chunk.note_id
            )
            new_chunks.extend(sub_chunks)
        
        return new_chunks
    
    def _split_text_by_tokens(
        self,
        text: str,
        section: str,
        parent_id: str,
        note_id: str
    ) -> List[NoteChunk]:
        """Split text into chunks respecting token boundaries."""
        import uuid
        
        # Split by sentences first (semantic boundaries)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        chunks = []
        current_chunk = ""
        current_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = self._count_tokens(sentence)
            
            # If adding this sentence would exceed limit, save chunk
            if current_tokens + sentence_tokens > self.chunk_size and current_chunk:
                chunk_id = str(uuid.uuid4())
                chunk = NoteChunk(
                    chunk_id=chunk_id,
                    note_id=note_id,
                    section=section,
                    text=current_chunk.strip(),
                    text_masked=None,
                    tokens=current_tokens,
                    chunk_index=len(chunks),
                    parent_chunk_id=parent_id,
                    metadata={"tier": 2}
                )
                chunks.append(chunk)
                current_chunk = sentence
                current_tokens = sentence_tokens
            else:
                current_chunk += f" {sentence}"
                current_tokens += sentence_tokens
        
        # Don't lose the last chunk
        if current_chunk.strip():
            chunk_id = str(uuid.uuid4())
            chunk = NoteChunk(
                chunk_id=chunk_id,
                note_id=note_id,
                section=section,
                text=current_chunk.strip(),
                text_masked=None,
                tokens=current_tokens,
                chunk_index=len(chunks),
                parent_chunk_id=parent_id,
                metadata={"tier": 2}
            )
            chunks.append(chunk)
        
        return chunks
    
    def _add_context_windows(self, chunks: List[NoteChunk]) -> List[NoteChunk]:
        """
        TIER 3: Add context window references to chunks.
        
        Each chunk stores references to neighbors for context.
        """
        for i, chunk in enumerate(chunks):
            neighbors = {
                "prev_chunk_id": chunks[i-1].chunk_id if i > 0 else None,
                "next_chunk_id": chunks[i+1].chunk_id if i < len(chunks) - 1 else None,
            }
            chunk.metadata["context_window"] = neighbors
            chunk.metadata["tier_3_processed"] = True
        
        return chunks
    
    def _deduplicate_chunks(self, chunks: List[NoteChunk]) -> List[NoteChunk]:
        """
        TIER 4: Remove duplicate or near-duplicate chunks.
        
        Uses simple string matching and token-based comparison.
        """
        seen = {}
        unique_chunks = []
        
        for chunk in chunks:
            # Create fingerprint: section + first 100 chars
            fingerprint = f"{chunk.section}:{chunk.text[:100]}"
            
            if fingerprint not in seen:
                seen[fingerprint] = True
                chunk.metadata["tier"] = 4
                chunk.metadata["is_duplicate"] = False
                unique_chunks.append(chunk)
            else:
                logger.debug(f"Removing duplicate chunk in section {chunk.section}")
        
        logger.info(f"Deduplication: {len(chunks)} chunks → {len(unique_chunks)} unique")
        return unique_chunks
    
    def _count_tokens(self, text: str) -> int:
        """
        Count tokens in text using tiktoken.
        
        Falls back to rough estimation if tiktoken unavailable.
        """
        if tokenizer:
            try:
                tokens = tokenizer.encode(text)
                return len(tokens)
            except Exception as e:
                logger.warning(f"Error counting tokens: {e}")
        
        # Fallback: rough estimation (4 chars ≈ 1 token)
        return len(text) // 4
    
    def validate_chunks(self, chunks: List[NoteChunk]) -> Tuple[bool, str]:
        """
        Validate chunk quality before storing.
        
        Returns:
            (is_valid, error_message)
        """
        if not chunks:
            return False, "No chunks generated"
        
        total_tokens = sum(c.tokens for c in chunks)
        
        if any(c.tokens > self.max_chunk_size for c in chunks):
            return False, f"Some chunks exceed max size {self.max_chunk_size}"
        
        if any(not c.text.strip() for c in chunks):
            return False, "Some chunks have empty text"
        
        logger.info(f"Chunk validation passed: {len(chunks)} chunks, {total_tokens} total tokens")
        return True, ""


# Singleton instance
_chunker = MedicalChunker()


def get_chunker() -> MedicalChunker:
    """Get or create chunker instance"""
    return _chunker


def chunk_note(note_data: Dict, note_id: str) -> List[NoteChunk]:
    """Convenience function to chunk a note"""
    return _chunker.chunk_note(note_data, note_id)
