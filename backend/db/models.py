"""Database models for HealthSync

Updated as of v3.1.0:
- RAG v3.1 models for masked chunks, reference tables, and audit logging
- PII masking with deterministic tokens
- Dual-storage architecture (masked + original)
- Encryption-ready reference tables
- Immutable audit log
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, LargeBinary, ForeignKey, Index, BigInteger, ARRAY
from sqlalchemy.dialects.postgresql import UUID, BYTEA
from datetime import datetime, timezone
from .base import Base
import uuid


class User(Base):
    """Active user model for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key = True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    username = Column(String(50), unique=True, nullable=False)
    email_id = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)


# ============================================================================
# RAG v3.1 Models - Reference Tables & Chunk Storage
# ============================================================================

class PatientReference(Base):
    """Map deterministic patient tokens to encrypted names"""
    __tablename__ = "patient_reference"
    
    id = Column(BigInteger, primary_key=True)
    patient_id = Column(UUID(as_uuid=True), unique=True, nullable=False)
    patient_token = Column(String(50), unique=True, nullable=False, index=True)
    patient_name_encrypted = Column(BYTEA, nullable=False)  # AES-256-GCM encrypted
    patient_name = Column(String(255), nullable=False)  # Cached plaintext (ephemeral)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_patient_reference_user_id', 'user_id'),
        Index('ix_patient_reference_token', 'patient_token'),
    )


class DoctorReference(Base):
    """Map deterministic doctor tokens to encrypted names"""
    __tablename__ = "doctor_reference"
    
    id = Column(BigInteger, primary_key=True)
    doctor_id = Column(UUID(as_uuid=True), unique=True, nullable=False)
    doctor_token = Column(String(50), unique=True, nullable=False, index=True)
    doctor_name_encrypted = Column(BYTEA, nullable=False)  # AES-256-GCM encrypted
    doctor_name = Column(String(255), nullable=False)  # Cached plaintext (ephemeral)
    specialization = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_doctor_reference_token', 'doctor_token'),
    )


class MaskedNoteChunk(Base):
    """Primary masked chunks for vector similarity search"""
    __tablename__ = "masked_note_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Chunk content
    chunk_text_masked = Column(Text, nullable=False)
    
    # Embedding (768-dimensional vector from Gemini)
    # Note: pgvector extension must be enabled for this to work
    # embedding = Column(Vector(768))  # Requires: CREATE EXTENSION vector
    embedding_model_version = Column(String(50), default='gemini-001')
    
    # Chunk metadata
    chunk_index = Column(Integer, nullable=False)
    section_type = Column(String(100))
    
    # Masking quality tracking (v3.1 improvement #7)
    masking_confidence = Column(Float, default=0.95)
    masking_failed = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_masked_chunks_user_id', 'user_id'),
        Index('ix_masked_chunks_note_id', 'note_id'),
        Index('ix_masked_chunks_confidence', 'masking_confidence'),
    )


class OriginalNoteChunk(Base):
    """Backup of original unmasked chunks (for recovery only)"""
    __tablename__ = "original_note_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True)  # Same as MaskedNoteChunk.id
    note_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Original (unmasked) text - stored as backup
    chunk_text_original = Column(Text, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)


class ChunkPatientMapping(Base):
    """Track which patients are referenced in each chunk (for token restoration)"""
    __tablename__ = "chunk_patient_mapping"
    
    id = Column(BigInteger, primary_key=True)
    chunk_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    patient_token = Column(String(50), nullable=False, index=True)
    patient_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_chunk_mapping_chunk_id', 'chunk_id'),
        Index('ix_chunk_mapping_token', 'patient_token'),
        Index('ix_chunk_mapping_user_id', 'user_id'),
    )


class RAGQueryAudit(Base):
    """Immutable audit log for all RAG queries (compliance tracking)"""
    __tablename__ = "rag_queries_audit"
    
    id = Column(BigInteger, primary_key=True)
    query_id = Column(UUID(as_uuid=True), default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Query information (stored MASKED for PII protection)
    query_text_masked = Column(Text, nullable=False)
    query_embedding_requested = Column(Boolean, default=False)
    
    # Retrieval information
    retrieved_chunk_count = Column(Integer)
    retrieved_chunk_ids = Column(ARRAY(UUID(as_uuid=True)))
    retrieval_method = Column(String(50), default='semantic')
    
    # LLM generation
    tokens_generated = Column(Integer)
    confidence_score = Column(Float)
    
    # Multi-patient flagging (v3.1 improvement #5)
    is_multi_patient_query = Column(Boolean, default=False)
    query_classification = Column(String(50))  # patient_specific, multi_patient, general, temporal
    
    # Metadata
    ip_address_masked = Column(String(50))
    response_time_ms = Column(Integer)
    model_version = Column(String(50), default='v3.1')
    
    # Timestamps
    query_time = Column(DateTime, default=datetime.utcnow)
    completion_time = Column(DateTime)
    
    __table_args__ = (
        Index('ix_rag_audit_user_time', 'user_id', 'query_time'),
        Index('ix_rag_audit_query_time', 'query_time'),
        Index('ix_rag_audit_multi_patient', 'is_multi_patient_query'),
    )