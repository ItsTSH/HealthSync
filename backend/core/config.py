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

# RAG Configuration (Phase 1+)
GEMINI_EMBEDDING_API_KEY = os.getenv("GEMINI_EMBEDDING_API_KEY", GEMINI_API_KEY)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# RAG Models
EMBEDDING_MODEL_RAG = "text-embedding-004"  # Gemini embedding model
EMBEDDING_DIMENSION = 768  # Gemini embeddings are 768-dim
LLM_MODEL_RAG = "mixtral-8x7b-32768"  # Groq model (free tier)

# Chunking Configuration
CHUNK_SIZE_TOKENS = 300  # Target chunk size in tokens
CHUNK_OVERLAP_TOKENS = 50  # Overlap between chunks
MAX_CHUNK_SIZE_TOKENS = 500  # Hard limit on chunk size

# Embedding Configuration
EMBEDDING_BATCH_SIZE = 20  # Batch size for Gemini API
EMBEDDING_RETRY_MAX = 3  # Max retries for failed embeds
EMBEDDING_TIMEOUT_SECONDS = 30  # Timeout per embedding request

# Retrieval Configuration
RETRIEVAL_TOP_K = 50  # Initial retrieval fetch size
RERANK_TOP_K = 5  # Final reranked result size
TEMPORAL_WEIGHT = 0.2  # Weight for temporal scoring (0.0-1.0)
SIMILARITY_WEIGHT = 0.8  # Weight for similarity scoring (0.0-1.0)
RECENCY_BOOST_DAYS = 7  # Boost results within N days

# LLM Configuration
LLM_MAX_TOKENS = 500  # Max tokens in LLM response
LLM_TEMPERATURE = 0.2  # Lower = more deterministic
LLM_TIMEOUT_SECONDS = 10  # Timeout for LLM calls

# Query Caching
QUERY_CACHE_TTL_SECONDS = 1800  # 30 minutes
ENABLE_QUERY_CACHE = True

# PII Masking Configuration
ENABLE_PII_MASKING = True
MASKING_PATTERNS = {
    "names": r"[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}",  # Simple name pattern
    "phone": r"\(\d{3}\)\s*\d{3}[-.]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4}",
    "address": r"\d{1,5}\s+[A-Z][a-z\s]+(?:St|Ave|Rd|Boulevard|Drive)",
}

# Audit Configuration
ENABLE_AUDIT_LOGGING = True
AUDIT_LOG_TABLE = "rag_queries_audit"


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