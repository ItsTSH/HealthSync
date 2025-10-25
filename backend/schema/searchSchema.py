from pydantic import BaseModel, Field
from typing import List, Optional
from .recordSchema import RecordResponse
from uuid import UUID

class SearchQuery(BaseModel):
    query: Optional[str] = None
    record_uuid: Optional[UUID] = None
    top_k: int = Field(default=5, ge=1, le=20)

class SearchResult(BaseModel):
    record: RecordResponse
    similarityScore: float
    matchedText: str