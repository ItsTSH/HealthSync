"""Database models for HealthSync

Updated as of v0.3.0:
- PatientRecord: Removed (all medical data now in Supabase)
- User: Active for JWT authentication
- All CRUD operations: Direct Supabase client
- AI Processing: Stateless FastAPI microservice
"""
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from .base import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID


class User(Base):
    """Active user model for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key = True, index=True)
    uuid = Column(UUID(as_uuid =  True), default=uuid.uuid4, unique=True, nullable=False)
    username= Column(String(50), unique=True, nullable=False)
    email_id = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)