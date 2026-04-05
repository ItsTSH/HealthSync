"""Redis client initialization and lifecycle management

This module provides a singleton Redis client for the application.
Uses redis.asyncio for async operations with proper connection pooling.
"""
import logging
from redis.asyncio import Redis, from_url
from core.config import REDIS_NOTES_URL

logger = logging.getLogger(__name__)

# Singleton Redis client instance
_redis_client: Redis | None = None


async def get_redis_client() -> Redis:
    """
    Get or create the Redis client singleton.
    
    Returns:
        Redis: Async Redis client instance with connection pooling
        
    Raises:
        ValueError: If REDIS_NOTES_URL is not configured
    """
    global _redis_client
    
    if _redis_client is None:
        if not REDIS_NOTES_URL:
            raise ValueError("REDIS_NOTES_URL environment variable is not configured")
        
        try:
            logger.info("Initializing Redis client...")
            # Create Redis client with connection pooling
            # decode_responses=True ensures we get strings instead of bytes
            _redis_client = await from_url(
                REDIS_NOTES_URL,
                encoding="utf-8",
                decode_responses=True,
                # Connection pool settings for HealthSync
                max_connections=20,  # Max concurrent connections
                socket_keepalive=True,
                socket_keepalive_options={
                    1: 1,  # TCP_KEEPIDLE: start after 1 second
                    2: 1,  # TCP_KEEPINTVL: interval 1 second
                    3: 3,  # TCP_KEEPCNT: max 3 probes
                }
            )
            
            # Test connection
            await _redis_client.ping()
            logger.info("✅ Redis client initialized and connection verified")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Redis client: {str(e)}")
            _redis_client = None
            raise
    
    return _redis_client


async def close_redis_client() -> None:
    """
    Close the Redis client connection.
    Call this during application shutdown.
    """
    global _redis_client
    
    if _redis_client is not None:
        try:
            logger.info("Closing Redis client...")
            await _redis_client.close()
            _redis_client = None
            logger.info("✅ Redis client closed")
        except Exception as e:
            logger.error(f"Error closing Redis client: {str(e)}")


async def is_redis_available() -> bool:
    """
    Check if Redis is available and responding.
    
    Returns:
        bool: True if Redis is available, False otherwise
    """
    try:
        client = await get_redis_client()
        await client.ping()
        return True
    except Exception as e:
        logger.warning(f"Redis unavailable: {str(e)}")
        return False
