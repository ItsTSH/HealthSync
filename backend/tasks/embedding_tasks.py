"""Celery task definitions for async note processing

Implements background embedding pipeline:
1. Fetch note from Supabase
2. Chunk note hierarchically (4-tier)
3. Apply PII masking
4. Generate embeddings (Gemini API, batch)
5. Store in pgvector
6. Update note status
"""
import logging
from typing import Dict, Optional
import asyncio
import uuid

from core.celery_app import app
from services.chunking import chunk_note, get_chunker
from services.pii_masking import mask_text, get_masker
from services.gemini_embeddings import embed_texts, get_embedding_service
from services.supabaseService import (
    fetch_note,
    update_note_status,
    get_supabase_admin_client,
)

logger = logging.getLogger(__name__)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_note_embedding(
    self,
    note_id: str,
    user_id: str,
    patient_id: str,
) -> Dict:
    """
    Async task to process note and generate embeddings.
    
    Pipeline:
    1. Fetch note from Supabase
    2. Chunk hierarchically (4-tier)
    3. Apply PII masking
    4. Generate Gemini embeddings (batch)
    5. Store in pgvector
    6. Update status to completed
    
    Args:
        note_id: UUID of note to process
        user_id: User ID (for access control)
        patient_id: Patient ID (for data isolation)
        
    Returns:
        Result dictionary with status and metadata
    """
    try:
        logger.info(f"Starting embedding task: note_id={note_id}")
        
        # STEP 1: Fetch note
        logger.info("Step 1: Fetching note from Supabase...")
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        note = loop.run_until_complete(fetch_note(note_id))
        
        if not note:
            raise Exception(f"Note {note_id} not found in Supabase")
        
        # Verify ownership
        if note.get("user_id") != user_id:
            raise Exception(f"User {user_id} doesn't own note {note_id}")
        
        # STEP 2: Update status to processing
        logger.info("Step 2: Setting status to processing...")
        loop.run_until_complete(
            update_note_status(note_id, "processing", None, user_id)
        )
        
        # STEP 3: Chunk note (4-tier hierarchical)
        logger.info("Step 3: Chunking note hierarchically...")
        chunks = chunk_note(note, note_id)
        
        if not chunks:
            raise Exception(f"No chunks generated for note {note_id}")
        
        logger.info(f"Generated {len(chunks)} chunks")
        
        # STEP 4: Apply PII masking
        logger.info("Step 4: Applying PII masking...")
        masker = get_masker()
        masked_chunks = []
        
        for chunk in chunks:
            masked_text, mask_registry = mask_text(chunk.text)
            chunk.text_masked = masked_text
            masked_chunks.append(chunk)
        
        # STEP 5: Generate embeddings (batch using Gemini)
        logger.info("Step 5: Generating embeddings...")
        
        # Prepare texts for embedding (use masked text)
        texts_to_embed = [c.text_masked or c.text for c in masked_chunks]
        
        embedding_service = get_embedding_service()
        embeddings, embed_stats = loop.run_until_complete(
            embedding_service.embed_texts(texts_to_embed)
        )
        
        if len(embeddings) != len(masked_chunks):
            raise Exception(
                f"Embedding count mismatch: {len(embeddings)} embeddings "
                f"vs {len(masked_chunks)} chunks"
            )
        
        logger.info(f"Generated {len(embeddings)} embeddings ({embed_stats['total_tokens']} tokens)")
        
        # STEP 6: Store in pgvector
        logger.info("Step 6: Storing embeddings in pgvector...")
        supabase = get_supabase_admin_client()
        
        # Prepare records for batch insert
        records = []
        for i, (chunk, embedding) in enumerate(zip(masked_chunks, embeddings)):
            record = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "patient_id": patient_id,
                "note_id": note_id,
                "chunk_index": i,
                "section": chunk.section,
                "parent_chunk_id": chunk.parent_chunk_id,
                "chunk_text": chunk.text,
                "chunk_text_masked": chunk.text_masked,
                "tokens": chunk.tokens,
                "embedding": embedding,
                "embedding_version": "gemini-004-v1",
                "timestamp": chunk.metadata.get("created_at") if chunk.metadata else None
            }
            records.append(record)
        
        # Batch insert
        response = supabase.table("note_embeddings").insert(records).execute()
        
        logger.info(f"Inserted {len(records)} embeddings into pgvector")
        
        # STEP 7: Update note status to completed
        logger.info("Step 7: Updating note status to completed...")
        completed = loop.run_until_complete(
            update_note_status(note_id, "completed", None, user_id)
        )
        
        if not completed:
            logger.warning("Failed to update status, but embeddings were stored")
        
        # STEP 8: Return success
        result = {
            "status": "success",
            "note_id": note_id,
            "chunks_count": len(chunks),
            "embeddings_count": len(embeddings),
            "tokens": embed_stats["total_tokens"],
        }
        
        logger.info(f"✅ Task completed: {result}")
        return result
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"❌ Task failed: {error_message}", exc_info=True)
        
        # Update status to failed
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(
                update_note_status(note_id, "failed", error_message, user_id)
            )
        except Exception as status_error:
            logger.warning(f"Failed to update status to failed: {status_error}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        else:
            # Max retries exhausted
            logger.error(f"Max retries exhausted for note {note_id}")
            return {
                "status": "failed",
                "note_id": note_id,
                "error": error_message,
                "retries": self.request.retries,
            }


@app.task(bind=True, max_retries=2)
def batch_embed_notes(self, note_ids: list) -> Dict:
    """
    Batch process multiple notes.
    
    Args:
        note_ids: List of (note_id, user_id, patient_id) tuples
        
    Returns:
        Batch result summary
    """
    logger.info(f"Starting batch embedding: {len(note_ids)} notes")
    
    results = {
        "total": len(note_ids),
        "successful": 0,
        "failed": 0,
        "note_results": []
    }
    
    for note_tuple in note_ids:
        if isinstance(note_tuple, (list, tuple)) and len(note_tuple) >= 3:
            note_id, user_id, patient_id = note_tuple[:3]
        else:
            note_id = str(note_tuple)
            user_id = None
            patient_id = None
        
        try:
            result = process_note_embedding(note_id, user_id, patient_id)
            results["note_results"].append(result)
            
            if result.get("status") == "success":
                results["successful"] += 1
            else:
                results["failed"] += 1
        except Exception as e:
            logger.error(f"Failed to embed note {note_id}: {e}")
            results["failed"] += 1
            results["note_results"].append({
                "note_id": note_id,
                "status": "failed",
                "error": str(e)
            })
    
    logger.info(f"Batch complete: {results['successful']} success, {results['failed']} failed")
    return results


@app.task(bind=True, max_retries=2)
def retry_failed_embedding(self, note_id: str, user_id: str, patient_id: str) -> Dict:
    """
    Retry embedding for failed notes.
    
    Args:
        note_id: Note to retry
        user_id: User ID
        patient_id: Patient ID
        
    Returns:
        Retry result
    """
    logger.info(f"Retrying embedding for note {note_id}")
    
    try:
        return process_note_embedding(note_id, user_id, patient_id)
    except Exception as e:
        logger.error(f"Retry failed: {e}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=120 * (2 ** self.request.retries))
        else:
            return {
                "status": "failed",
                "note_id": note_id,
                "error": str(e),
                "retries_exhausted": True
            }


@app.task(bind=True)
def monitor_task_status(self, task_id: str) -> Dict:
    """
    Monitor status of a processing task.
    
    Args:
        task_id: Celery task ID
        
    Returns:
        Task status information
    """
    from celery.result import AsyncResult
    
    task = AsyncResult(task_id, app=app)
    
    return {
        "task_id": task_id,
        "state": task.state,
        "info": task.info,
        "ready": task.ready(),
        "successful": task.successful() if task.ready() else None,
    }


# Task registration
logger.info("✅ Celery tasks registered")
