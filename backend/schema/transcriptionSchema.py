from pydantic import BaseModel

class TranscriptionResponse(BaseModel):
    transcription: str
    extractedMetadata: str