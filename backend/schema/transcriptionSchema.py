from pydantic import BaseModel
from typing import Dict, Any

class TranscriptionResponse(BaseModel):
    # transcription: str
    extractedMetadata: Dict[str, Any]