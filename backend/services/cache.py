"""Caching service for Redis-based cache-aside pattern

This module provides utilities for:
- Consistent cache key generation with namespacing
- Cache-aside pattern implementation with TTL jitter
- Null result caching (cache 404s with short TTL)
- Cache invalidation strategies
- Hot key protection (access-time TTL extension)
- Graceful fallback when Redis is unavailable
- Security: UUID validation, key namespacing, no sensitive logging
"""
import logging
import json
import random
import uuid as uuid_module
from typing import Optional, Any, Callable, TypeVar
from datetime import timedelta

from core.redis import get_redis_client, is_redis_available

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Default TTL values (in seconds) with jitter ranges
DEFAULT_TTL = 300  # 5 minutes base
DEFAULT_TTL_JITTER = 60  # Add 0-60s random jitter

NOTE_TTL = 600  # 10 minutes base
NOTE_TTL_JITTER = 120  # Add 0-120s random jitter

NOTES_LIST_TTL = 120  # 2 minutes base
NOTES_LIST_TTL_JITTER = 30  # Add 0-30s random jitter

ANALYSIS_TTL = 1800  # 30 minutes base
ANALYSIS_TTL_JITTER = 180  # Add 0-180s random jitter

# Null result caching (404s) - short TTL to avoid stale 404s
NULL_RESULT_TTL = 60  # Cache "not found" for 1 minute
NULL_RESULT_JITTER = 10  # Add 0-10s random jitter

# Sentinel value for cached null results
_NULL_SENTINEL = "__CACHE_NULL__"

# Hot key protection threshold
HOT_KEY_ACCESS_THRESHOLD = 5  # Number of accesses before extending TTL
HOT_KEY_EXTEND_FACTOR = 1.5  # Extend TTL by this factor for hot keys


class CacheKeyNamespace:
    """Consistent cache key namespace definitions with security"""
    
    @staticmethod
    def _validate_id(value: str, id_type: str = "id") -> None:
        """Validate and sanitize ID inputs (UUID format required)
        
        Args:
            value: ID to validate
            id_type: Type of ID for error message
            
        Raises:
            ValueError: If ID is not a valid UUID
        """
        if not value or not isinstance(value, str):
            raise ValueError(f"Invalid {id_type}: must be a non-empty string")
        
        # Check if it looks like a UUID (loose validation)
        value = value.strip()
        if len(value) not in [36, 32]:  # UUID formats: with/without hyphens
            raise ValueError(f"Invalid {id_type}: UUID format expected (got length {len(value)})")
        
        # Allow alphanumeric, hyphens only
        if not all(c.isalnum() or c == '-' for c in value):
            raise ValueError(f"Invalid {id_type}: contains invalid characters")
    
    # Single note cache key: note:{note_id}
    @staticmethod
    def note(note_id: str) -> str:
        CacheKeyNamespace._validate_id(note_id, "note_id")
        return f"healthsync:note:{note_id.lower()}"
    
    # Notes list by user: notes:user:{user_id}
    @staticmethod
    def notes_by_user(user_id: str) -> str:
        CacheKeyNamespace._validate_id(user_id, "user_id")
        return f"healthsync:notes:user:{user_id.lower()}"
    
    # Note analysis/embeddings: note:analysis:{note_id}
    @staticmethod
    def note_analysis(note_id: str) -> str:
        CacheKeyNamespace._validate_id(note_id, "note_id")
        return f"healthsync:note:analysis:{note_id.lower()}"


def _add_ttl_jitter(base_ttl: int, jitter_range: int) -> int:
    """
    Add random jitter to TTL to prevent cache stampede.
    
    When many entries expire at the same time, it causes a thundering herd
    where all requests miss cache simultaneously and hit the DB together.
    Adding jitter spreads expirations over time.
    
    Args:
        base_ttl: Base TTL in seconds
        jitter_range: Max random jitter to add in seconds
        
    Returns:
        TTL with jitter added
    """
    if base_ttl <= 0:
        return base_ttl
    
    jitter = random.randint(0, jitter_range)
    final_ttl = base_ttl + jitter
    logger.debug(f"TTL jitter: {base_ttl}s + {jitter}s → {final_ttl}s")
    return final_ttl


class CacheService:
    """Core caching service with cache-aside pattern and advanced features
    
    Features:
    - Cache-aside (lazy loading) pattern
    - TTL jitter to prevent cache stampede
    - Null result caching (cache 404s with short TTL)
    - Hot key protection (extend TTL for frequently accessed items)
    - Graceful fallback when Redis unavailable
    - Security hardening (UUID validation, namespacing, secure logging)
    """
    
    @staticmethod
    async def get(key: str, extend_ttl_if_hot: bool = False) -> Optional[Any]:
        """
        Retrieve value from cache with optional hot key protection.
        
        Args:
            key: Cache key to retrieve
            extend_ttl_if_hot: If True, extend TTL for hot keys (frequently accessed)
            
        Returns:
            Deserialized value if found and Redis available, None otherwise.
            Returns None for both cache miss AND null sentinel (neither error).
        """
        try:
            if not await is_redis_available():
                logger.debug(f"Redis unavailable, skipping cache GET for key: {key}")
                return None
            
            client = await get_redis_client()
            value = await client.get(key)
            
            if value:
                try:
                    # Check for null sentinel
                    if value == _NULL_SENTINEL:
                        logger.debug(f"✗ Cache hit (null result) for key: {key}")
                        return None  # Return None - caller won't know it was a cached null
                    
                    # Try to deserialize JSON
                    cached_data = json.loads(value)
                    logger.debug(f"✓ Cache hit for key: {key}")
                    
                    # Hot key protection: extend TTL if this is a frequently accessed key
                    if extend_ttl_if_hot:
                        await _extend_ttl_if_hot(client, key)
                    
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
        ttl: Optional[int] = None,
        is_null: bool = False
    ) -> bool:
        """
        Store value in cache with TTL and optional jitter.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time-to-live in seconds (if None, uses DEFAULT_TTL with jitter)
            is_null: If True, caches null result with short TTL and NULL_RESULT_TTL default
            
        Returns:
            True if successful, False if Redis unavailable or error
        """
        try:
            if not await is_redis_available():
                logger.debug(f"Redis unavailable, skipping cache SET for key: {key}")
                return False
            
            client = await get_redis_client()
            
            # Determine TTL based on cache type
            if is_null:
                # Cache null results with short TTL (404s)
                final_ttl = _add_ttl_jitter(NULL_RESULT_TTL, NULL_RESULT_JITTER)
                serialized = _NULL_SENTINEL
                logger.debug(f"Caching null result for key: {key} (TTL: {final_ttl}s)")
            else:
                # Serialize to JSON if not already a string
                if isinstance(value, str):
                    serialized = value
                else:
                    serialized = json.dumps(value, default=str)
                
                # Use provided TTL or add jitter to default
                if ttl is None:
                    final_ttl = _add_ttl_jitter(DEFAULT_TTL, DEFAULT_TTL_JITTER)
                else:
                    # Still add jitter even if TTL provided (better for stamp prevention)
                    final_ttl = _add_ttl_jitter(ttl, max(ttl // 10, 10))
            
            await client.setex(key, final_ttl, serialized)
            logger.debug(f"✓ Cached key: {key} (TTL: {final_ttl}s)")
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
            pattern: Pattern to match (e.g., "healthsync:notes:user:*")
            
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
        ttl: Optional[int] = None,
        cache_null: bool = True
    ) -> Optional[Any]:
        """
        Implement cache-aside (lazy loading) pattern with null result caching.
        
        Logic:
        1. Try to get from cache
        2. If cache hit → return immediately
        3. If cache miss → fetch from source
        4. If source returns None and cache_null=True → cache the null result
        5. Store in cache with TTL and jitter
        6. If Redis unavailable → fetch from source directly (fallback)
        
        Args:
            key: Cache key
            fetch_fn: Async function to fetch from source (Supabase)
            ttl: Optional TTL override (will still add jitter)
            cache_null: Whether to cache null results (default: True)
            
        Returns:
            Data from cache or source, None if not found
            
        Example:
            data = await CacheService.cache_aside(
                key="note:123",
                fetch_fn=lambda: fetch_note("123"),
                ttl=NOTE_TTL,
                cache_null=True
            )
        """
        try:
            # Try to get from cache
            cached_data = await CacheService.get(key, extend_ttl_if_hot=True)
            if cached_data is not None:
                return cached_data
            
            # Check if we have a cached null result
            try:
                if not await is_redis_available():
                    pass  # Skip null check if Redis unavailable
                else:
                    client = await get_redis_client()
                    cached_value = await client.get(key)
                    if cached_value == _NULL_SENTINEL:
                        logger.debug(f"✓ Cache hit (null) for key: {key}, returning None")
                        return None
            except Exception:
                pass  # Ignore check errors, will fetch from source
            
            # Cache miss → fetch from source
            logger.debug(f"Fetching from source for key: {key}")
            source_data = await fetch_fn()
            
            # Store in cache with appropriate TTL
            if source_data is not None:
                # Fire and forget cache set operation
                try:
                    await CacheService.set(key, source_data, ttl=ttl)
                except Exception as e:
                    logger.warning(f"Failed to cache data for {key}: {str(e)}")
            elif cache_null:
                # Cache null result (404s) with short TTL
                try:
                    await CacheService.set(key, None, is_null=True)
                except Exception as e:
                    logger.warning(f"Failed to cache null result for {key}: {str(e)}")
            
            return source_data
            
        except Exception as e:
            logger.error(f"Error in cache_aside for key {key}: {str(e)}")
            # Fallback: try to fetch from source one more time
            try:
                return await fetch_fn()
            except Exception as fetch_error:
                logger.error(f"Failed to fetch from source: {str(fetch_error)}")
                raise


async def _extend_ttl_if_hot(client, key: str, access_count_key: Optional[str] = None) -> None:
    """
    Hot key protection: extend TTL if key is frequently accessed.
    
    This prevents cache thrashing for very popular keys.
    
    Args:
        client: Redis client
        key: Cache key
        access_count_key: Optional key to track accesses (default: "{key}:accesses")
    """
    try:
        if access_count_key is None:
            access_count_key = f"{key}:accesses"
        
        # Increment access counter (expire after 1 hour)
        access_count = await client.incr(access_count_key)
        await client.expire(access_count_key, 3600)
        
        # If this is a hot key, extend its TTL
        if access_count >= HOT_KEY_ACCESS_THRESHOLD:
            current_ttl = await client.ttl(key)
            
            if current_ttl and current_ttl > 0:
                extended_ttl = int(current_ttl * HOT_KEY_EXTEND_FACTOR)
                await client.expire(key, extended_ttl)
                logger.debug(f"Extended TTL for hot key {key}: {current_ttl}s → {extended_ttl}s (accesses: {access_count})")
    
    except Exception as e:
        logger.debug(f"Failed to extend TTL for hot key {key}: {str(e)}")
        # Don't raise - this is an optimization, not critical


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
    "DEFAULT_TTL_JITTER",
    "NOTE_TTL",
    "NOTE_TTL_JITTER",
    "NOTES_LIST_TTL",
    "NOTES_LIST_TTL_JITTER",
    "ANALYSIS_TTL",
    "ANALYSIS_TTL_JITTER",
    "NULL_RESULT_TTL",
    "NULL_RESULT_JITTER",
]
