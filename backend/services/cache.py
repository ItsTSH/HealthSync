"""Caching service for Redis-based cache-aside pattern

This module provides utilities for:
- Consistent cache key generation with namespacing
- Cache-aside pattern implementation
- Cache invalidation strategies
- Graceful fallback when Redis is unavailable
"""
import logging
import json
from typing import Optional, Any, Callable, TypeVar
from datetime import timedelta

from core.redis import get_redis_client, is_redis_available

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Default TTL values (in seconds)
DEFAULT_TTL = 300  # 5 minutes
NOTE_TTL = 600  # 10 minutes for single notes
NOTES_LIST_TTL = 120  # 2 minutes for lists
ANALYSIS_TTL = 1800  # 30 minutes for AI outputs


class CacheKeyNamespace:
    """Consistent cache key namespace definitions"""
    
    # Single note cache key: note:{note_id}
    @staticmethod
    def note(note_id: str) -> str:
        return f"note:{note_id}"
    
    # Notes list by user: notes:user:{user_id}
    @staticmethod
    def notes_by_user(user_id: str) -> str:
        return f"notes:user:{user_id}"
    
    # Note analysis/embeddings: note:analysis:{note_id}
    @staticmethod
    def note_analysis(note_id: str) -> str:
        return f"note:analysis:{note_id}"


class CacheService:
    """Core caching service with cache-aside pattern and graceful fallback"""
    
    @staticmethod
    async def get(key: str) -> Optional[Any]:
        """
        Retrieve value from cache.
        
        Args:
            key: Cache key to retrieve
            
        Returns:
            Deserialized value if found and Redis is available, None otherwise
        """
        try:
            if not await is_redis_available():
                logger.debug(f"Redis unavailable, skipping cache GET for key: {key}")
                return None
            
            client = await get_redis_client()
            value = await client.get(key)
            
            if value:
                try:
                    # Try to deserialize JSON
                    cached_data = json.loads(value)
                    logger.debug(f"✓ Cache hit for key: {key}")
                    return cached_data
                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(f"Failed to deserialize cache value for key {key}: {str(e)}")
                    # Return raw string if not JSON
                    return value
            else:
                logger.debug(f"✗ Cache miss for key: {key}")
                return None
                
        except Exception as e:
            logger.warning(f"Redis GET error for key {key}: {str(e)}, falling back to source")
            return None
    
    @staticmethod
    async def set(
        key: str,
        value: Any,
        ttl: int = DEFAULT_TTL
    ) -> bool:
        """
        Store value in cache with TTL.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time-to-live in seconds
            
        Returns:
            True if successful, False if Redis unavailable or error
        """
        try:
            if not await is_redis_available():
                logger.debug(f"Redis unavailable, skipping cache SET for key: {key}")
                return False
            
            client = await get_redis_client()
            
            # Serialize to JSON if not already a string
            if isinstance(value, str):
                serialized = value
            else:
                serialized = json.dumps(value, default=str)
            
            await client.setex(key, ttl, serialized)
            logger.debug(f"✓ Cached key: {key} (TTL: {ttl}s)")
            return True
            
        except Exception as e:
            logger.warning(f"Redis SET error for key {key}: {str(e)}, continuing without cache")
            return False
    
    @staticmethod
    async def delete(key: str) -> bool:
        """
        Delete a key from cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if deleted, False if key didn't exist or Redis unavailable
        """
        try:
            if not await is_redis_available():
                logger.debug(f"Redis unavailable, skipping cache DELETE for key: {key}")
                return False
            
            client = await get_redis_client()
            deleted = await client.delete(key)
            
            if deleted:
                logger.debug(f"✓ Deleted cache key: {key}")
            else:
                logger.debug(f"Key not found in cache: {key}")
            
            return bool(deleted)
            
        except Exception as e:
            logger.warning(f"Redis DELETE error for key {key}: {str(e)}")
            return False
    
    @staticmethod
    async def delete_pattern(pattern: str) -> int:
        """
        Delete multiple keys matching a pattern.
        
        Args:
            pattern: Pattern to match (e.g., "notes:user:*")
            
        Returns:
            Number of keys deleted
        """
        try:
            if not await is_redis_available():
                logger.debug(f"Redis unavailable, skipping pattern delete for: {pattern}")
                return 0
            
            client = await get_redis_client()
            
            # Get all matching keys
            keys = await client.keys(pattern)
            
            if not keys:
                logger.debug(f"No keys matching pattern: {pattern}")
                return 0
            
            # Delete all matching keys
            deleted_count = await client.delete(*keys)
            logger.debug(f"✓ Deleted {deleted_count} keys matching pattern: {pattern}")
            
            return deleted_count
            
        except Exception as e:
            logger.warning(f"Redis pattern delete error for {pattern}: {str(e)}")
            return 0
    
    @staticmethod
    async def cache_aside(
        key: str,
        fetch_fn: Callable[[], Any],
        ttl: int = DEFAULT_TTL
    ) -> Any:
        """
        Implement cache-aside (lazy loading) pattern.
        
        Logic:
        1. Try to get from cache
        2. If cache hit → return immediately
        3. If cache miss → fetch from source
        4. Store in cache and return
        5. If Redis unavailable → fetch from source directly (fallback)
        
        Args:
            key: Cache key
            fetch_fn: Async function to fetch from source (Supabase)
            ttl: TTL for cached value
            
        Returns:
            Data from cache or source
            
        Example:
            data = await CacheService.cache_aside(
                key="note:123",
                fetch_fn=lambda: fetch_note("123"),
                ttl=NOTE_TTL
            )
        """
        try:
            # Try to get from cache
            cached_data = await CacheService.get(key)
            if cached_data is not None:
                return cached_data
            
            # Cache miss → fetch from source
            logger.debug(f"Fetching from source for key: {key}")
            source_data = await fetch_fn()
            
            # Store in cache (non-blocking, don't wait for result)
            if source_data is not None:
                # Fire and forget cache set operation
                try:
                    await CacheService.set(key, source_data, ttl)
                except Exception as e:
                    logger.warning(f"Failed to cache data for {key}: {str(e)}")
            
            return source_data
            
        except Exception as e:
            logger.error(f"Error in cache_aside for key {key}: {str(e)}")
            # Fallback: try to fetch from source one more time
            try:
                return await fetch_fn()
            except Exception as fetch_error:
                logger.error(f"Failed to fetch from source: {str(fetch_error)}")
                raise


class InvalidationService:
    """Cache invalidation strategies for write operations"""
    
    @staticmethod
    async def invalidate_note(note_id: str, user_id: Optional[str] = None) -> None:
        """
        Invalidate all cache entries related to a specific note.
        
        Called when a note is updated or deleted.
        
        Invalidates:
        - note:{note_id} (single note)
        - note:analysis:{note_id} (embeddings/analysis)
        - notes:user:{user_id} (if user_id provided)
        
        Args:
            note_id: ID of the note being invalidated
            user_id: Optional user ID to also invalidate their notes list
        """
        try:
            # Invalidate single note
            await CacheService.delete(CacheKeyNamespace.note(note_id))
            
            # Invalidate analysis/embeddings
            await CacheService.delete(CacheKeyNamespace.note_analysis(note_id))
            
            # Invalidate user's notes list if user_id provided
            if user_id:
                await CacheService.delete(CacheKeyNamespace.notes_by_user(user_id))
            
            logger.info(f"✓ Invalidated cache for note {note_id}")
            
        except Exception as e:
            logger.error(f"Error invalidating cache for note {note_id}: {str(e)}")
    
    @staticmethod
    async def invalidate_user_notes(user_id: str) -> None:
        """
        Invalidate all notes for a specific user.
        
        Called when creating/deleting notes to refresh the user's notes list.
        
        Args:
            user_id: ID of the user
        """
        try:
            await CacheService.delete(CacheKeyNamespace.notes_by_user(user_id))
            logger.info(f"✓ Invalidated notes list for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error invalidating user notes for {user_id}: {str(e)}")


# Export public API
__all__ = [
    "CacheService",
    "InvalidationService",
    "CacheKeyNamespace",
    "DEFAULT_TTL",
    "NOTE_TTL",
    "NOTES_LIST_TTL",
    "ANALYSIS_TTL",
]
