"""Schemas for note processing operations"""
from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum


class ProcessingStatusEnum(str, Enum):
    """Valid processing status values"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessNoteRequest(BaseModel):
    """Request model for process-note endpoint"""
    note_id: str = Field(..., description="UUID of the note to process from Supabase")


class ProcessNoteResponse(BaseModel):
    """Response model for process-note endpoint"""
    status: str = Field(..., description="Operation status (success/duplicate/error)")
    note_id: str = Field(..., description="UUID of the processed note")
    message: Optional[str] = Field(None, description="Additional message/error details")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "note_id": "550e8400-e29b-41d4-a716-446655440000",
                "message": "Note processed and stored in ChromaDB"
            }
        }
