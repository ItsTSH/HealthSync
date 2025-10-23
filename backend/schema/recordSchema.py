from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RecordCreate(BaseModel):
    patientName: str
    age: int
    gender: str
    chiefComplaint: str
    symptoms: Optional[str] = None
    previousDiagnosis: Optional[str] = None
    previousMedications: Optional[str] = None

class RecordResponse(RecordCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True