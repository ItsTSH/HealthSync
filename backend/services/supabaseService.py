"""Supabase service for managing notes operations with Redis caching

This module provides:
- Cached note fetching (single notes and user's notes)
- Cache-aside pattern for read operations with null result caching
- Cache invalidation on writes (with UUID validation)
- Graceful fallback to Supabase when Redis is unavailable
- Security: All IDs are validated, safe logging (no sensitive data)
"""
import logging
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from core.config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_TABLE_NOTES
from services.cache import (
    CacheService,
    InvalidationService,
    CacheKeyNamespace,
    NOTE_TTL,
    NOTES_LIST_TTL,
)

logger = logging.getLogger(__name__)


def get_supabase_client() -> Client:
    """Initialize and return Supabase client (anon key - respects RLS)"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def get_supabase_admin_client() -> Client:
    """Initialize and return Supabase admin client (service role - bypasses RLS)
    
    Used for backend operations that need to access all data regardless of RLS policies.
    Use this for processing notes, updating statuses, etc.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def fetch_note_from_supabase(note_id: str) -> Optional[Dict[str, Any]]:
    """
    Internal: Fetch note from Supabase (no caching, used as cache source)
    
    Args:
        note_id: UUID of the note to fetch
        
    Returns:
        Note data dict or None if not found
    """
    try:
        supabase = get_supabase_admin_client()
        response = (
            supabase.table(SUPABASE_TABLE_NOTES)
            .select("*")
            .eq("noteID", note_id)
            .execute()
        )
        # Check if we got any results
        if response.data and len(response.data) > 0:
            logger.info(f"Successfully fetched note {note_id} from Supabase")
            return response.data[0]  # Return first result (should only be one due to primary key)
        else:
            logger.warning(f"Note {note_id} not found in Supabase (0 rows returned)")
            return None
    except Exception as e:
        logger.error(f"Error fetching note {note_id} from Supabase: {str(e)}")
        return None


async def fetch_note(note_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a note from Supabase by note_id with Redis caching.
    
    Implements cache-aside pattern with null result caching:
    1. Check Redis cache first
    2. If hit → return cached data immediately
    3. If miss → fetch from Supabase
    4. If found → store in cache with TTL + jitter
    5. If not found → cache null result with short TTL (prevent repeated DB lookups)
    6. If Redis unavailable → fetch directly from Supabase (fallback)
    
    Uses the admin client to bypass RLS policies (backend processing needs access to all notes)
    
    Args:
        note_id: UUID of the note to fetch
        
    Returns:
        Note data dict or None if not found
        
    Security:
    - Input validated as UUID before cache key generation
    - No sensitive data logged
    - Null results cached with short TTL (60s) to prevent repeated 404s
        
    Note:
        This function is async to support Redis operations.
        If you have sync code, use: asyncio.run(fetch_note(note_id))
    """
    cache_key = CacheKeyNamespace.note(note_id)
    
    # Cache-aside pattern with fetch function
    async def source_fetch():
        return fetch_note_from_supabase(note_id)
    
    return await CacheService.cache_aside(
        key=cache_key,
        fetch_fn=source_fetch,
        ttl=NOTE_TTL,
        cache_null=True  # Cache null results (404s) with short TTL
    )


async def update_note_status(
    note_id: str, 
    status: str, 
    error: Optional[str] = None,
    user_id: Optional[str] = None
) -> bool:
    """
    Update the status (and optionally error) for a note.
    
    Automatically invalidates Redis cache after successful update to ensure
    consistency between cache and database.
    
    Uses the admin client to bypass RLS policies (backend needs access to update all notes)
    
    Args:
        note_id: UUID of the note to update
        status: New status ('pending', 'processing', 'completed', 'failed')
        error: Optional error message (should be set when status is 'failed')
        user_id: Optional user ID to also invalidate their notes list cache
        
    Returns:
        True if successful, False otherwise
        
    Cache Invalidation:
    - Invalidates: note:{note_id} (single note cache)
    - Invalidates: note:analysis:{note_id} (if embeddings cached)
    - Invalidates: notes:user:{user_id} (if user_id provided)
    
    Security:
    - IDs validated before cache operations
    - Error message logged safely (no sensitive data)
    """
    try:
        supabase = get_supabase_admin_client()
        update_data = {"status": status}
        if error is not None:
            update_data["error"] = error
        else:
            update_data["error"] = None
            
        response = (
            supabase.table(SUPABASE_TABLE_NOTES)
            .update(update_data)
            .eq("noteID", note_id)
            .execute()
        )
        logger.info(f"Successfully updated status for note {note_id} to '{status}'")
        
        # Invalidate cache after successful update (ensures consistency)
        # This is CRITICAL: do not cache stale data after DB update
        try:
            await InvalidationService.invalidate_note(note_id, user_id)
        except Exception as e:
            logger.warning(f"Failed to invalidate cache for note {note_id}: {str(e)}")
            # Log but continue - cache invalidation failure shouldn't crash the API
        
        return True
    except Exception as e:
        logger.error(f"Error updating note {note_id} status to '{status}': {str(e)}")
        return False


async def update_note_processed_status(
    note_id: str,
    is_processed: bool = True,
    user_id: Optional[str] = None
) -> bool:
    """
    DEPRECATED: Use update_note_status() instead
    
    Update the processed flag for a note (legacy compatibility)
    This maps the old boolean flag to the new status-based system
    
    Args:
        note_id: UUID of the note to update
        is_processed: Whether the note has been processed
        user_id: Optional user ID to also invalidate their notes list
        
    Returns:
        True if successful, False otherwise
    """
    status = "completed" if is_processed else "pending"
    return await update_note_status(note_id, status, None, user_id)


def validate_note_data(note: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate required fields in a note
    
    Args:
        note: Note data dictionary
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = ["patientName", "symptoms", "chiefComplaint"]
    
    for field in required_fields:
        if field not in note or not note[field]:
            return False, f"Missing required field: {field}"
    
    return True, ""


def normalize_note_metadata(note: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize and clean note metadata for consistent embedding
    
    Args:
        note: Raw note data from Supabase
        
    Returns:
        Normalized note data
    """
    normalized = {}
    
    # Map Supabase fields to normalized structure
    field_mapping = {
        "patientName": "patientName",
        "age": "age",
        "chiefComplaint": "chiefComplaint",
        "symptoms": "symptoms",
        "previousDiagnosis": "previousDiagnosis",
        "previousMedications": "previousMedications",
        "allergies": "allergies",
        "medication": "medication",
    }
    
    for supabase_field, normalized_field in field_mapping.items():
        if supabase_field in note:
            value = note[supabase_field]
            # Clean up None values and empty strings
            if value:
                if isinstance(value, str):
                    value = value.strip()
                if value:
                    normalized[normalized_field] = value
    
    return normalized


def fetch_notes_by_user_from_supabase(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Internal: Fetch all notes for a user from Supabase (no caching, used as cache source)
    
    Args:
        user_id: UUID of the user
        limit: Maximum number of notes to fetch
        
    Returns:
        List of note data dicts or empty list if none found
    """
    try:
        supabase = get_supabase_admin_client()
        response = (
            supabase.table(SUPABASE_TABLE_NOTES)
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        
        if response.data:
            logger.info(f"Successfully fetched {len(response.data)} notes for user {user_id}")
            return response.data
        else:
            logger.info(f"No notes found for user {user_id}")
            return []
            
    except Exception as e:
        logger.error(f"Error fetching notes for user {user_id} from Supabase: {str(e)}")
        return []


async def fetch_notes_by_user(
    user_id: str,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Fetch all notes for a user with Redis caching.
    
    Implements cache-aside pattern:
    1. Check Redis cache first
    2. If hit → return cached data
    3. If miss → fetch from Supabase
    4. Store in Redis with shorter TTL (lists change more frequently)
    5. If Redis unavailable → fetch directly from Supabase
    
    Args:
        user_id: UUID of the user
        limit: Maximum number of notes to fetch (default: 50)
        
    Returns:
        List of note data dicts or empty list if none found
        
    Note:
        Uses shorter TTL than individual notes since user note lists change more frequently.
        Returns empty list rather than None for consistency.
    """
    cache_key = CacheKeyNamespace.notes_by_user(user_id)
    
    async def source_fetch():
        return fetch_notes_by_user_from_supabase(user_id, limit)
    
    result = await CacheService.cache_aside(
        key=cache_key,
        fetch_fn=source_fetch,
        ttl=NOTES_LIST_TTL,
        cache_null=False  # Always cache the list (even if empty), but don't use null sentinel
    )
    
    return result if result is not None else []
