"""Routes for AI processing operations (Stateless processing layer)"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Request, Body
from fastapi.responses import JSONResponse
from schema.processingSchema import ProcessNoteRequest, ProcessNoteResponse
from services.supabaseService import (
    fetch_note,
    update_note_status,
    validate_note_data,
    normalize_note_metadata,
)
from services.embeddings import generateEmbeddingsForNote, storeNoteEmbedding, compute_content_hash
from core.auth import get_current_user
from core.redis import acquire_processing_lock, release_processing_lock
from core.config import get_cache_headers
from core.rate_limit import limiter, LIMITS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/process", tags=["Processing"])


@router.post("/note")
@limiter.limit(LIMITS["process"])
async def process_note(
    request: Request,
    note_data: ProcessNoteRequest = Body(...),
    current_user: str = Depends(get_current_user)
):
    """
    Process a note from Supabase: validate, normalize, embed, and store in ChromaDB
    
    🔐 Requires authentication
    
    ⚠️ STATUS-BASED PROCESSING PIPELINE:
    
    Process flow:
    1. Fetch note from Supabase (with caching)
    2. Check if already processing/completed (prevent duplicates)
    3. Set status to 'processing'
    4. Validate required fields
    5. Normalize metadata
    6. Generate embeddings
    7. Store in ChromaDB
    8. Update status to 'completed' on success, 'failed' with error on failure
    
    Args:
        request: FastAPI Request object (required by slowapi rate limiter)
        note_data: ProcessNoteRequest with note_id
        current_user: Authenticated user ID (from JWT token)
        
    Returns:
        ProcessNoteResponse with status and result
        
    Raises:
        HTTPException: If any step fails
    """
    note_id = note_data.note_id
    processing_lock_acquired = False
    
    try:
        # STEP 0: Acquire processing lock (request deduplication via Redis)
        # Phase 2.4: Prevent concurrent requests for same note
        logger.info(f"Attempting to acquire processing lock for note {note_id}...")
        processing_lock_acquired = await acquire_processing_lock(note_id, ttl_seconds=300)
        
        if not processing_lock_acquired:
            logger.info(f"Processing lock held for note {note_id}, rejecting duplicate request")
            return JSONResponse(
                status_code=409,
                content=ProcessNoteResponse(
                    status="duplicate",
                    note_id=note_id,
                    message="Note is already being processed (duplicate request rejected)"
                ).model_dump(),
                headers=get_cache_headers("volatile")
            )
        
        # STEP 1: Fetch note from Supabase (uses Redis cache)
        logger.info(f"Fetching note {note_id} from Supabase for user {current_user}...")
        note = await fetch_note(note_id)
        
        if not note:
            logger.error(f"Note {note_id} not found in Supabase")
            raise HTTPException(
                status_code=404,
                detail=f"Note with ID {note_id} not found in Supabase"
            )
        
        # Verify note belongs to current user (RLS should handle this)
        if note.get("user_id") != current_user:
            logger.warning(f"User {current_user} attempted to process note {note_id} they don't own")
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to process this note"
            )
        
        # STEP 2: Check if already processing or completed (prevent duplicate processing)
        current_status = note.get("status", "pending")
        if current_status == "processing":
            logger.info(f"Note {note_id} is already being processed, returning early...")
            return JSONResponse(
                status_code=409,
                content=ProcessNoteResponse(
                    status="duplicate",
                    note_id=note_id,
                    message="Note is already being processed"
                ).model_dump(),
                headers=get_cache_headers("volatile")
            )
        
        if current_status == "completed":
            logger.info(f"Note {note_id} already completed, skipping...")
            return JSONResponse(
                status_code=200,
                content=ProcessNoteResponse(
                    status="already_processed",
                    note_id=note_id,
                    message="Note was already fully processed"
                ).model_dump(),
                headers=get_cache_headers("volatile")
            )
        
        # STEP 3: Set status to 'processing' to prevent concurrent processing
        logger.info(f"Setting note {note_id} status to 'processing'...")
        status_updated = await update_note_status(note_id, "processing", None, current_user)
        if not status_updated:
            logger.warning(f"Failed to set processing status for note {note_id}, continuing anyway...")
        
        # STEP 4: Validate required fields
        logger.info(f"Validating note {note_id} data...")
        is_valid, error_msg = validate_note_data(note)
        
        if not is_valid:
            logger.warning(f"Note {note_id} validation failed: {error_msg}")
            # Set status to 'failed' with error message
            await update_note_status(note_id, "failed", error_msg, current_user)
            raise HTTPException(
                status_code=400,
                detail=f"Validation failed: {error_msg}"
            )
        
        # STEP 5: Normalize metadata
        logger.info(f"Normalizing metadata for note {note_id}...")
        normalized_data = normalize_note_metadata(note)
        
        # STEP 5.5: Check if content hash matches (Phase 2.5: Embedding cache with content hash)
        # Skip re-embedding if content hasn't changed
        current_content_hash = compute_content_hash(normalized_data)
        stored_hash = note.get("embedding_hash")
        
        if stored_hash and current_content_hash == stored_hash:
            logger.info(f"Content unchanged for note {note_id}, skipping re-embedding (hash: {current_content_hash})")
            await update_note_status(note_id, "completed", None, current_user)
            return JSONResponse(
                status_code=200,
                content=ProcessNoteResponse(
                    status="already_embedded",
                    note_id=note_id,
                    message=f"Content unchanged, skipped re-embedding (hash: {current_content_hash})"
                ).model_dump(),
                headers=get_cache_headers("volatile")
            )
        
        # STEP 6: Generate embeddings
        logger.info(f"Generating embeddings for note {note_id} (new hash: {current_content_hash})...")
        embedding_text = generateEmbeddingsForNote(normalized_data)
        
        if not embedding_text.strip():
            error_msg = "Unable to generate embeddings from note data"
            logger.error(f"No embeddable content generated for note {note_id}")
            # Set status to 'failed' with error message
            await update_note_status(note_id, "failed", error_msg, current_user)
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )
        
        # STEP 7: Store in ChromaDB
        logger.info(f"Storing embedding in ChromaDB for note {note_id}...")
        storeNoteEmbedding(note_id, embedding_text, normalized_data)
        
        # STEP 8: Update status to 'completed' and store embedding hash
        logger.info(f"Updating status for note {note_id} to 'completed' with embedding hash {current_content_hash}...")
        completed = await update_note_status(note_id, "completed", None, current_user)
        
        if not completed:
            # Log warning - embedding is stored in ChromaDB even if status update fails
            logger.warning(f"Failed to update completed status for note {note_id}, but embedding was stored")
        
        logger.info(f"✅ Successfully processed note {note_id}")
        return JSONResponse(
            status_code=200,
            content=ProcessNoteResponse(
                status="success",
                note_id=note_id,
                message="Note successfully processed and stored in ChromaDB"
            ).model_dump(),
            headers=get_cache_headers("volatile")
        )
        
    except HTTPException:
        # Release lock on HTTP errors
        if processing_lock_acquired:
            try:
                await release_processing_lock(note_id)
            except Exception as lock_error:
                logger.warning(f"Failed to release lock on HTTP error: {str(lock_error)}")
        raise
    except Exception as e:
        error_str = str(e)
        logger.error(f"❌ Unexpected error processing note {note_id}: {error_str}", exc_info=True)
        # Update status to 'failed' with error message
        try:
            await update_note_status(note_id, "failed", error_str, current_user)
        except Exception as status_error:
            logger.error(f"Failed to update status to failed: {str(status_error)}")
        
        # Release lock on all errors
        if processing_lock_acquired:
            try:
                await release_processing_lock(note_id)
            except Exception as lock_error:
                logger.warning(f"Failed to release lock on error: {str(lock_error)}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Error processing note: {error_str}"
        )
    finally:
        # Ensure lock is released even if successful
        if processing_lock_acquired:
            try:
                await release_processing_lock(note_id)
            except Exception as lock_error:
                logger.warning(f"Failed to release lock in finally block: {str(lock_error)}")
