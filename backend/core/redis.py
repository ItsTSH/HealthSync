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


async def acquire_processing_lock(note_id: str, ttl_seconds: int = 300) -> bool:
    """
    Acquire an exclusive processing lock for a note using Redis.
    
    Prevents concurrent processing of the same note. Uses Redis SET with NX (not exist)
    and EX (expire) for atomic operation.
    
    Args:
        note_id: UUID of the note to lock
        ttl_seconds: Lock TTL in seconds (default 300s = 5 min)
        
    Returns:
        True if lock acquired, False if already locked
        
    Raises:
        Exception: If Redis unavailable or error occurs
    """
    try:
        if not await is_redis_available():
            logger.debug(f"Redis unavailable, skipping lock acquisition for note {note_id}")
            return True  # Fail open - allow processing if Redis down
        
        client = await get_redis_client()
        lock_key = f"processing:lock:{note_id}"
        
        # SET with NX (only if not exists) and EX (expiry in seconds)
        # Returns True if lock acquired, None if key already exists
        result = await client.set(
            lock_key,
            "1",
            nx=True,
            ex=ttl_seconds
        )
        
        if result:
            logger.info(f"✓ Acquired processing lock for note {note_id} ({ttl_seconds}s TTL)")
            return True
        else:
            logger.warning(f"✗ Processing lock held for note {note_id}")
            return False
            
    except Exception as e:
        logger.error(f"Error acquiring processing lock for {note_id}: {str(e)}")
        raise


async def release_processing_lock(note_id: str) -> bool:
    """
    Release a processing lock for a note.
    
    Called after processing completes (success or failure).
    
    Args:
        note_id: UUID of the note to unlock
        
    Returns:
        True if lock released, False if key didn't exist or error
    """
    try:
        if not await is_redis_available():
            logger.debug(f"Redis unavailable, skipping lock release for note {note_id}")
            return True  # Fail open
        
        client = await get_redis_client()
        lock_key = f"processing:lock:{note_id}"
        
        deleted = await client.delete(lock_key)
        
        if deleted:
            logger.info(f"✓ Released processing lock for note {note_id}")
        else:
            logger.debug(f"Lock not found for note {note_id} (may have expired)")
        
        return bool(deleted)
        
    except Exception as e:
        logger.error(f"Error releasing processing lock for {note_id}: {str(e)}")
        return False
