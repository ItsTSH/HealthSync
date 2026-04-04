from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID

class SearchQuery(BaseModel):
    """Query for semantic search"""
    query: Optional[str] = Field(None, description="Text query for semantic search")
    note_id: Optional[int] = Field(None, description="Note ID to use for similarity search")
    record_uuid: Optional[UUID] = Field(None, description="Legacy: Record UUID for backward compatibility")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of results to return")

class NoteSearchResult(BaseModel):
    """Enriched search result with note data from Supabase"""
    note_id: int = Field(..., description="ID of the note")
    note_data: Dict[str, Any] = Field(..., description="Full note data from Supabase")
    similarity_score: float = Field(..., description="Cosine similarity score (0-1)")
    matched_text: str = Field(..., description="Text snippet that matched")
    
    class Config:
        json_schema_extra = {
            "example": {
                "note_id": 123,
                "note_data": {
                    "id": 123,
                    "patientName": "John Doe",
                    "age": 45,
                    "chiefComplaint": "Persistent cough",
                    "symptoms": "Dry cough, chest pain",
                },
                "similarity_score": 0.89,
                "matched_text": "Chief Complaint: Persistent cough | Symptoms: Dry cough"
            }
        }

class SearchResult(BaseModel):
    """Legacy search result for backward compatibility"""
    record: Dict[str, Any] = Field(..., description="Record data")
    similarityScore: float = Field(..., description="Similarity score")
    matchedText: str = Field(..., description="Matched text")
