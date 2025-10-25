from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from .base import Base
from sqlalchemy.types import TypeDecorator, LargeBinary
from core.security import encryptValues, decryptValues
import uuid
from sqlalchemy.dialects.postgresql import UUID

class EncryptedType(TypeDecorator):
    impl = LargeBinary
    cache_ok = True

    def processBindParam(self, value, dialect):
        return encryptValues(value)
    
    def processResultValue(self, value, dialect):
        return decryptValues(value)

class PatientRecord(Base):
    __tablename__ = "patient_records"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid = True), default = uuid.uuid4, unique=True, nullable=False)
    patientName = Column(EncryptedType, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(EncryptedType, nullable=False)
    chiefComplaint = Column(Text, nullable=False)
    symptoms = Column(Text)
    previousDiagnosis = Column(Text)
    previousMedications = Column(Text)
    otherInfo = Column(Text)
    transcription = Column(Text)
    extractedNotes = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))