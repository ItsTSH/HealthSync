from pydantic import BaseModel
from typing import Dict

class TranscriptionResponse(BaseModel):
    transcription: str
    extractedMetadata: str