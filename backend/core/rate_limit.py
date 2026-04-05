"""Rate limiting utilities for FastAPI endpoints.

This module provides a limiter instance initialized with remote address key function.
Import and use @limiter.limit() decorators on endpoints.
"""
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

# Global limiter instance - used for all endpoints
limiter = Limiter(key_func=get_remote_address)

# Rate limit tiers (requests per minute)
LIMITS = {
    "transcribe": "10/minute",      # 10 transcription requests per minute (resource-heavy)
    "process": "30/minute",          # 30 processing requests per minute (medium)
    "search": "60/minute",           # 60 search requests per minute (light)
    "default": "100/minute",         # 100 requests per minute (general)
}

__all__ = ["limiter", "LIMITS"]
