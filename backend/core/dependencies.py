from sqlalchemy.orm import sessionmaker
from .config import (
    DATABASE_URL, 
    SUPABASE_URL, 
    SUPABASE_KEY,
    GEMINI_API_KEY,
    ELEVENLABS_API_KEY,
    SECRET_KEY,
    FERNET_KEY
)
from sqlalchemy import create_engine
from db.base import Base

# Validate critical environment variables on startup
def _validate_environment():
    """Validate that all required environment variables are set"""
    missing_vars = []
    
    critical_vars = {
        'DATABASE_URL': DATABASE_URL,
        'SUPABASE_URL': SUPABASE_URL,
        'SUPABASE_KEY': SUPABASE_KEY,
        'GEMINI_API_KEY': GEMINI_API_KEY,
        'ELEVENLABS_API_KEY': ELEVENLABS_API_KEY,
        'SECRET_KEY': SECRET_KEY,
        'FERNET_KEY': FERNET_KEY,
    }
    
    for var_name, var_value in critical_vars.items():
        if not var_value:
            missing_vars.append(var_name)
    
    if missing_vars:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing_vars)}\n"
            f"Please set these variables in your .env file or environment."
        )

_validate_environment()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base.metadata.create_all(bind=engine)

def get_db():
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()