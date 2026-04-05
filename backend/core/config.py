import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
FERNET_KEY = os.getenv("FERNET_KEY")
ENCRYPTION_KEY = FERNET_KEY
SECRET_KEY = os.getenv("SECRET_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_TABLE_NOTES = "notes"

# Redis Configuration
REDIS_NOTES_URL = os.getenv("REDIS_NOTES_URL")


def get_cache_headers(volatility: str = "medium") -> dict:
    """
    Get appropriate Cache-Control headers for API responses.
    
    Creates cache headers based on data volatility:
    - "fast": Static content (health checks, metadata) - cache 1 hour
    - "medium": User-specific data (notes, analysis) - cache 5 minutes
    - "volatile": Real-time data (current status, live updates) - never cache
    
    Args:
        volatility: One of "fast", "medium", "volatile"
        
    Returns:
        Dictionary with "Cache-Control" header value
        
    Example:
        return JSONResponse(
            content={"status": "ok"},
            headers=get_cache_headers("fast")
        )
    """
    cache_strategies = {
        "fast": {"Cache-Control": "public, max-age=3600"},           # 1 hour (static)
        "medium": {"Cache-Control": "private, max-age=300"},         # 5 minutes (user-specific)
        "volatile": {"Cache-Control": "no-cache, must-revalidate"}, # Never cache (real-time)
    }
    return cache_strategies.get(volatility, cache_strategies["medium"])