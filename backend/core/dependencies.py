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
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

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

# NOTE: Supabase schema is managed via SQL migrations (SUPABASE_V4_INTEGRATION.md)
# Do NOT use Base.metadata.create_all() as it will try to recreate existing indexes
# and cause "DuplicateTable" errors. SQLAlchemy models are here for ORM queries only.
# Uncomment below ONLY if you're running a fresh database with NO existing schema:
# Base.metadata.create_all(bind=engine)

def get_db():
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_supabase(token: str = "") -> Client:
    """Get Supabase client for use in FastAPI routes.
    
    Uses anon key which respects RLS policies.
    If token is provided, it sets the user session so auth.uid() works in RLS policies.
    
    Usage in routes (authenticated):
        async def my_route(
            current_user: str = Depends(get_current_user),
            user_token: str = Depends(get_current_user_token),
            supabase=Depends(lambda token=Depends(get_current_user_token): get_supabase(token))
        ):
            # Now Supabase RLS policies have auth.uid() context
    
    Args:
        token: Optional JWT token to set user context for RLS
    
    Returns:
        Supabase Client instance with user context (if token provided)
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment")
    
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # If token is provided, set the user session so RLS policies can access auth.uid()
    if token:
        try:
            client.auth.set_session(access_token=token, refresh_token="")
        except Exception as e:
            # If setting session fails, client will still work but RLS may not have user context
            logger.warning(f"Failed to set Supabase user session: {str(e)}")
    
    return client