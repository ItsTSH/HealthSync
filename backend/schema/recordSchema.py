"""Record schemas - DEPRECATED

⚠️  DEPRECATION NOTICE
As of v0.2.0, this module is deprecated. It was used for legacy CRUD operations
which have been migrated to Supabase.

Classes here are kept for backward compatibility with legacy code.
Do not use for new development.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

# Legacy schemas kept for backward compatibility only
class RecordCreate(BaseModel):
    """DEPRECATED - Do not use"""
    patientName: str
    age: Optional[int] = 0
    gender: str
    chiefComplaint: str
    symptoms: Optional[str] = None
    previousDiagnosis: Optional[str] = None
    previousMedications: Optional[str] = None
    otherInfo: Optional[str] = None


class RecordUpdate(BaseModel):
    """DEPRECATED - Do not use"""
    patientName: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    chiefComplaint: Optional[str] = None
    symptoms: Optional[str] = None
    previousDiagnosis: Optional[str] = None
    previousMedications: Optional[str] = None
    otherInfo: Optional[str] = None


class RecordResponse(RecordCreate):
    """DEPRECATED - Do not use"""
    id: int
    uuid: UUID
    created_at: datetime

    class Config:
        from_attributes = True
