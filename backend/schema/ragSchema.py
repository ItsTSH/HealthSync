"""Schema definitions for RAG endpoints

Request and response models for /search/rag endpoint
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class QueriedPatient(BaseModel):
    """Patient matched from query"""
    name: str
    patient_id: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    match_type: str  # "exact" or "fuzzy"


class ChatStatus(BaseModel):
    """Chat status in metadata and completion events"""
    query_count: int = Field(..., ge=0, le=10)
    is_full: bool = False
    query_limit: int = 10


class PatientContext(BaseModel):
    """Patient context in metadata"""
    auto_selected: bool
    patient_id: Optional[str]
    confidence: float = 0.0


class RAGQueryRequest(BaseModel):
    """
    Request model for RAG query endpoint (v4.0+).

    Changes:
    - chat_id: New, required for multi-chat support
    - patient_id: Now optional (backend extracts from query)
    """
    chat_id: str  # NEW: required for multi-chat
    query: str = Field(..., description="User's medical question")
    patient_id: Optional[str] = None  # CHANGED: now optional
    section_filter: Optional[str] = Field(
        None,
        description="Optional filter by section (symptoms, medications, etc.)"
    )
    top_k: Optional[int] = Field(
        5,
        description="Number of results to return (default 5)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "What medications is the patient allergic to?",
                "patient_id": "550e8400-e29b-41d4-a716-446655440000",
                "section_filter": "allergies",
                "top_k": 5
            }
        }


class Citation(BaseModel):
    """Citation for RAG response"""
    chunk_id: str = Field(..., description="Chunk ID from note_embeddings table")
    note_id: str = Field(..., description="UUID of source note")
    section: str = Field(..., description="Medical section (symptoms, diagnosis, etc.)")
    timestamp: Optional[str] = Field(None, description="When this chunk was created")
    score: Optional[float] = Field(None, description="Retrieval/reranking score")


class StreamAmbiguityEvent(BaseModel):
    """NEW: Ambiguity event when multiple patient matches detected"""
    type: str = "ambiguity"
    matches: List[QueriedPatient]
    please_select: bool = True
    message: Optional[str] = None


class RAGQueryResponse(BaseModel):
    """Response model for RAG query endpoint"""
    answer: str = Field(..., description="AI-generated answer based on context")
    citations: List[Citation] = Field(default_factory=list, description="Source citations")
    confidence: float = Field(..., description="Confidence score 0.0-1.0")
    retrieval_count: int = Field(..., description="Number of chunks retrieved")
    processing_time_ms: int = Field(..., description="Total processing time in ms")
    queried_patients: Optional[List[QueriedPatient]] = None  # NEW v4.0+
    
    class Config:
        json_schema_extra = {
            "example": {
                "answer": "Based on the patient's medical records, they are allergic to Penicillin (severe reaction). No drug interactions documented.",
                "citations": [
                    {
                        "chunk_id": "uuid-1",
                        "note_id": "note-uuid-1",
                        "section": "allergies",
                        "timestamp": "2024-01-15T10:30:00Z",
                        "score": 0.95
                    }
                ],
                "confidence": 0.92,
                "retrieval_count": 5,
                "processing_time_ms": 1240
            }
        }


class ProcessNoteAsyncRequest(BaseModel):
    """Request to process note asynchronously"""
    note_id: str = Field(..., description="UUID of note to process")
    
    class Config:
        json_schema_extra = {
            "example": {
                "note_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class ProcessNoteAsyncResponse(BaseModel):
    """Response for async note processing request"""
    task_id: str = Field(..., description="Celery task ID for polling")
    status: str = Field(..., description="Status: queued")
    message: str = Field(..., description="User-friendly message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "celery-task-id-uuid",
                "status": "queued",
                "message": "Note processing queued. Use task_id to check status."
            }
        }


class TaskStatusResponse(BaseModel):
    """Response for task status polling"""
    task_id: str
    state: str  # PENDING, STARTED, SUCCESS, FAILURE, RETRY
    status_message: Optional[str]
    progress_percent: Optional[int]
    result: Optional[Dict]
    error: Optional[str]


class RAGDebugResponse(BaseModel):
    """Debug response (for development only)"""
    query: str
    query_embedding_dim: int
    retrieved_chunks: int
    retrieved_scores: List[float]
    reranked_chunks: int
    reranked_scores: List[float]
    llm_prompt_length: int
    llm_response_tokens: int
    total_duration_ms: int
