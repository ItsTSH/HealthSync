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
    otherInfo: Optional[str] = None

class RecordUpdate(BaseModel):
    patientName: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    chiefComplaint: Optional[str] = None
    symptoms: Optional[str] = None
    previousDiagnosis: Optional[str] = None
    previousMedications: Optional[str] = None
    otherInfo: Optional[str] = None

class RecordResponse(RecordCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True