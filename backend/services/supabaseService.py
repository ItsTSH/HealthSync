"""Supabase service for managing notes operations"""
import logging
from typing import Optional, Dict, Any
from supabase import create_client, Client
from core.config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_TABLE_NOTES

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


def fetch_note(note_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a note from Supabase by note_id
    
    Uses the admin client to bypass RLS policies (backend processing needs access to all notes)
    
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


def update_note_status(
    note_id: str, 
    status: str, 
    error: Optional[str] = None
) -> bool:
    """
    Update the status (and optionally error) for a note
    
    Uses the admin client to bypass RLS policies (backend needs access to update all notes)
    
    Args:
        note_id: UUID of the note to update
        status: New status ('pending', 'processing', 'completed', 'failed')
        error: Optional error message (should be set when status is 'failed')
        
    Returns:
        True if successful, False otherwise
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
        return True
    except Exception as e:
        logger.error(f"Error updating note {note_id} status: {str(e)}")
        return False


def update_note_processed_status(note_id: str, is_processed: bool = True) -> bool:
    """
    DEPRECATED: Use update_note_status() instead
    
    Update the processed flag for a note (legacy compatibility)
    This maps the old boolean flag to the new status-based system
    
    Args:
        note_id: UUID of the note to update
        is_processed: Whether the note has been processed
        
    Returns:
        True if successful, False otherwise
    """
    status = "completed" if is_processed else "pending"
    return update_note_status(note_id, status, None)


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
