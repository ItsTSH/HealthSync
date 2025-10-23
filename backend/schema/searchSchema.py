from pydantic import BaseModel, Field
from typing import List
from .recordSchema import RecordResponse

class SearchQuery(BaseModel):
    query: str
    top_k: int = Field(default=5, ge=1, le=20)

class SearchResult(BaseModel):
    record: RecordResponse
    similarityScore: float
    matchedText: str