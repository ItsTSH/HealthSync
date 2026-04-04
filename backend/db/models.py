"""Database models for HealthSync

⚠️  DEPRECATION NOTICE FOR PatientRecord
As of v0.2.0, PatientRecord is deprecated. This table is no longer used for 
production CRUD operations. All medical data is now stored in Supabase.

PatientRecord remains in the codebase for:
- Legacy code compatibility
- Historical reference
- Gradual migration path

New data should be created directly in Supabase.
User model remains active for authentication.
"""
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
    """
    DEPRECATED - Do not use for new records
    Use Supabase notes table instead
    """
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


class User(Base):
    """Active user model for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key = True, index=True)
    uuid = Column(UUID(as_uuid =  True), default=uuid.uuid4, unique=True, nullable=False)
    username= Column(String(50), unique=True, nullable=False)
    email_id = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)