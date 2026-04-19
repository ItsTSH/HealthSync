print("Starting app...")
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routers import searchRoutes, transcriptionRoutes, authRoutes, processingRoutes, ragRoutes
from core.config import get_cache_headers

app = FastAPI(title="HealthSync API", version="v1.0.0-rag")

# Rate limiting configuration
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Custom rate limit exceeded handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please try again later.",
            "error": "too_many_requests"
        },
        headers={"Retry-After": "60"}
    )

# CORS middleware (handles cross-origin requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression middleware (compress responses > 1KB with gzip)
# Must be positioned after CORS middleware
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000  # Only compress responses larger than 1KB
)

# NEW: RAG routes (semantic search + LLM synthesis)
app.include_router(ragRoutes.router)

# Core processing routes (includes async embedding)
app.include_router(processingRoutes.router)

# Search routes (legacy, replaced by RAG)
app.include_router(searchRoutes.router)

# Transcription & extraction (unchanged)
app.include_router(transcriptionRoutes.router)

# Authentication (unchanged)
app.include_router(authRoutes.router)

@app.get("/")
def health():
    """Health check endpoint - static content, cacheable"""
    return JSONResponse(
        content={"status": "healthy", "service": "HealthSync API", "version": "v0.2.0"},
        headers=get_cache_headers("fast")  # Cache for 1 hour (static health check)
    )