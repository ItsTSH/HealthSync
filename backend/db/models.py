from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from .base import Base

class PatientRecord(Base):
    __tablename__ = "patient_records"

    id = Column(Integer, primary_key=True, index=True)
    patientName = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(50), nullable=False)
    chiefComplaint = Column(Text, nullable=False)
    symptoms = Column(Text)
    previousDiagnosis = Column(Text)
    previousMedications = Column(Text)
    otherInfo = Column(Text)
    transcription = Column(Text)
    extractedNotes = Column(Text)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))