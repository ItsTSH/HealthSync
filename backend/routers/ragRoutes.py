"""RAG search endpoints

Implements production-grade semantic search with retrieval-augmented generation.
Multi-stage pipeline: retrieval → reranking → LLM synthesis.

v3.1 Features:
- Query classification (patient-specific, multi-patient, general, temporal)
- Masking confidence filtering
- Multi-factor confidence calibration
- Token restoration post-generation
- PII leak detection
- Comprehensive audit logging
"""
import logging
import time
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Body
from fastapi.responses import JSONResponse, StreamingResponse
import json

from schema.ragSchema import (
    RAGQueryRequest, RAGQueryResponse, Citation,
    ProcessNoteAsyncRequest, ProcessNoteAsyncResponse, TaskStatusResponse
)
from core.auth import get_current_user
from core.rate_limit import limiter, LIMITS
from core.config import get_cache_headers
from core.redis import get_redis_client
from services.gemini_embeddings import embed_single
from services.retrieval import retrieve_chunks
from services.reranking import rerank_chunks
from services.llm import generate_response, stream_response
from services.audit import log_rag_query
from services.query_classifier import QueryClassifier
from services.confidence import calibrate_confidence
from services.token_restoration import restore_response
from services.pii_masking import PIIMaskingService
from core.exceptions import (
    ValidationError,
    EmbeddingError,
    RetrievalError,
    RerankingError,
    LLMError,
    AuthorizationError,
    NotFoundError,
)
from tasks.embedding_tasks import process_note_embedding
from services.supabaseService import fetch_note

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["RAG"])

# Initialize v3.1 services
query_classifier = QueryClassifier()
pii_masking_service = PIIMaskingService()


@router.post("/rag", response_model=RAGQueryResponse)
@limiter.limit(LIMITS.get("search", "30/minute"))
async def rag_search(
    request: Request,
    query_input: RAGQueryRequest = Body(...),
    current_user: str = Depends(get_current_user)
) -> RAGQueryResponse:
    """
    Multi-stage RAG search endpoint.
    
    🔐 Requires authentication
    
    Pipeline:
    1. Embed query using Gemini API
    2. Retrieve chunks (hard filter by user+patient, top-50)
    3. Rerank (top-5 most relevant)
    4. Generate response using Groq LLM
    5. Return with citations and confidence
    
    💾 Query caching: Responses cached for 30 minutes
    
    Args:
        request: FastAPI Request (for rate limiting)
        query_input: RAGQueryRequest with query and patient_id
        current_user: Authenticated user ID (from JWT)
        
    Returns:
        RAGQueryResponse with answer, citations, confidence
        
    Raises:
        HTTPException: If validation or processing fails
    """
    start_time = time.time()
    patient_id = query_input.patient_id
    query_text = query_input.query
    section_filter = query_input.section_filter
    top_k = min(query_input.top_k or 5, 10)  # Safety: max 10 results
    
    logger.info(
        f"RAG search: user={current_user}, patient={patient_id}, "
        f"query_len={len(query_text)}"
    )
    
    try:
        # STAGE 0: Validate inputs
        if len(query_text) < 3 or len(query_text) > 1000:
            raise HTTPException(
                status_code=400,
                detail="Query must be 3-1000 characters"
            )
        
        # STAGE 1: Check cache
        cache_key = f"rag:{current_user}:{patient_id}:{hash(query_text) % 1000000}"
        try:
            redis = await get_redis_client()
            cached_response = await redis.get(cache_key)
            if cached_response:
                logger.info(f"Cache hit for query: {cache_key}")
                import json
                cached_data = json.loads(cached_response)
                return RAGQueryResponse(**cached_data)
        except Exception as e:
            logger.warning(f"Cache lookup failed: {e}")
        
        # STAGE 2: Embed query using Gemini API
        logger.info("Stage 2: Embedding query...")
        embed_start = time.time()
        query_embedding = await embed_single(query_text)
        embed_duration_ms = int((time.time() - embed_start) * 1000)
        
        if not query_embedding or len(query_embedding) != 768:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate query embedding"
            )
        
        # STAGE 3: Retrieve chunks (multi-stage: filter → similarity → temporal)
        logger.info("Stage 3: Retrieving chunks...")
        retrieval_start = time.time()
        retrieved = await retrieve_chunks(
            user_id=current_user,
            patient_id=patient_id,
            query_embedding=query_embedding,
            top_k=50,  # Retrieve more before reranking
            section_filter=section_filter,
        )
        retrieval_duration_ms = int((time.time() - retrieval_start) * 1000)
        
        if not retrieved:
            logger.warning(f"No chunks retrieved for query")
            return RAGQueryResponse(
                answer="No matching medical records found for this query.",
                citations=[],
                confidence=0.0,
                retrieval_count=0,
                processing_time_ms=int((time.time() - start_time) * 1000),
            )
        
        logger.info(f"Retrieved {len(retrieved)} chunks")
        
        # STAGE 4: Rerank top chunks
        logger.info("Stage 4: Reranking chunks...")
        reranking_start = time.time()
        
        # Convert retrieval results to dict format for reranker
        retrieved_dicts = [
            {
                "id": r.chunk_id,
                "chunk_id": r.chunk_id,
                "note_id": r.note_id,
                "section": r.section,
                "text": r.text,
                "chunk_text": r.text,
                "final_score": r.final_score,
                "reranking_score": 0.5,  # Will be updated
                "timestamp": r.timestamp,
            }
            for r in retrieved
        ]
        
        reranked = await rerank_chunks(
            query=query_text,
            chunks=retrieved_dicts,
            top_k=top_k,
        )
        reranking_duration_ms = int((time.time() - reranking_start) * 1000)
        
        logger.info(f"Reranked to {len(reranked)} chunks")
        
        # STAGE 5: Generate LLM response
        logger.info("Stage 5: Generating LLM response...")
        llm_start = time.time()
        
        # Convert reranked results for LLM
        chunk_dicts = [
            {
                "chunk_id": r.chunk_id,
                "note_id": r.note_id,
                "section": r.section,
                "text": r.text,
                "reranking_score": r.reranking_score,
                "timestamp": "",  # Get from DB if needed
            }
            for r in reranked
        ]
        
        llm_response = await generate_response(
            query=query_text,
            context_chunks=chunk_dicts,
            patient_info={"patient_id": patient_id},
        )
        llm_duration_ms = int((time.time() - llm_start) * 1000)
        
        # STAGE 6: Format response with citations
        logger.info("Stage 6: Formatting response...")
        citations = [
            Citation(
                chunk_id=c.get("chunk_id"),
                note_id=c.get("note_id"),
                section=c.get("section"),
                timestamp=c.get("timestamp"),
                score=c.get("reranking_score"),
            )
            for c in chunk_dicts
        ]
        
        total_duration_ms = int((time.time() - start_time) * 1000)
        
        response = RAGQueryResponse(
            answer=llm_response.answer,
            citations=citations,
            confidence=llm_response.confidence,
            retrieval_count=len(retrieved),
            processing_time_ms=total_duration_ms,
        )
        
        # STAGE 7: Audit logging
        try:
            await log_rag_query(
                user_id=current_user,
                patient_id=patient_id,
                query_text=query_text,
                retrieval_data={"count": len(retrieved), "duration_ms": retrieval_duration_ms},
                reranking_data={"count": len(reranked), "duration_ms": reranking_duration_ms},
                llm_data={
                    "model": llm_response.model,
                    "tokens_used": llm_response.tokens_used,
                    "duration_ms": llm_duration_ms,
                },
                response_data={
                    "confidence": llm_response.confidence,
                    "citations": [c.dict() for c in citations],
                },
            )
        except Exception as e:
            logger.warning(f"Audit logging failed: {e}")
        
        # STAGE 8: Cache response
        try:
            cache_ttl = 1800  # 30 minutes
            await redis.setex(cache_key, cache_ttl, response.model_dump_json())
        except Exception as e:
            logger.warning(f"Failed to cache response: {e}")
        
        logger.info(
            f"✅ RAG query complete: confidence={response.confidence:.2f}, "
            f"chunks={response.retrieval_count}, duration={response.processing_time_ms}ms"
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ RAG search error: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"RAG search failed: {error_msg}"
        )


@router.post("/process-note-async", response_model=ProcessNoteAsyncResponse)
@limiter.limit(LIMITS.get("process", "10/minute"))
async def process_note_async(
    request: Request,
    process_req: ProcessNoteAsyncRequest = Body(...),
    current_user: str = Depends(get_current_user)
) -> ProcessNoteAsyncResponse:
    """
    Asynchronously process note for embeddings.
    
    🔐 Requires authentication
    
    Enqueues a Celery task to:
    1. Fetch note from Supabase
    2. Chunk hierarchically (4-tier)
    3. Apply PII masking
    4. Generate Gemini embeddings
    5. Store in pgvector
    
    Returns immediately with task_id for polling status.
    
    Args:
        request: FastAPI Request
        process_req: ProcessNoteAsyncRequest with note_id
        current_user: Authenticated user ID
        
    Returns:
        ProcessNoteAsyncResponse with task_id
    """
    note_id = process_req.note_id
    
    logger.info(f"Async process request: note_id={note_id}, user={current_user}")
    
    try:
        # Verify note exists and belongs to user
        note = await fetch_note(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        if note.get("user_id") != current_user:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Enqueue task
        task = process_note_embedding.delay(
            note_id=note_id,
            user_id=current_user,
            patient_id=note.get("patient_id"),
        )
        
        logger.info(f"Enqueued task: {task.id}")
        
        return ProcessNoteAsyncResponse(
            task_id=task.id,
            status="queued",
            message="Note processing queued. Check status with task_id.",
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to enqueue task: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process note: {str(e)}"
        )


@router.get("/task-status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: str = Depends(get_current_user)
) -> TaskStatusResponse:
    """
    Poll task status.
    
    Args:
        task_id: Celery task ID
        current_user: Authenticated user
        
    Returns:
        TaskStatusResponse with current status
    """
    from celery.result import AsyncResult
    from core.celery_app import app
    
    try:
        task_result = AsyncResult(task_id, app=app)
        
        status_map = {
            "PENDING": "pending",
            "STARTED": "processing",
            "SUCCESS": "completed",
            "FAILURE": "failed",
            "RETRY": "retrying",
            "REVOKED": "cancelled",
        }
        
        return TaskStatusResponse(
            task_id=task_id,
            state=status_map.get(task_result.state, "unknown"),
            status_message=None,
            progress_percent=None,
            result=task_result.result if task_result.successful() else None,
            error=str(task_result.info) if task_result.failed() else None,
        )
        
    except Exception as e:
        logger.error(f"Error checking task status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to check task status"
        )


@router.post("/rag-stream")
@limiter.limit(LIMITS.get("search", "30/minute"))
async def rag_search_stream(
    request: Request,
    query_input: RAGQueryRequest = Body(...),
    current_user: str = Depends(get_current_user)
):
    """
    Streaming RAG search endpoint.
    
    🔐 Requires authentication
    
    Streams medical response tokens in real-time using Server-Sent Events (SSE).
    
    Pipeline:
    1. Embed query using Gemini API
    2. Retrieve chunks (hard filter by user+patient, top-50)
    3. Rerank (top-5 most relevant)
    4. Stream tokens from Groq LLM
    5. Stream with citations and metadata
    
    Response format (NDJSON):
    ```
    {"type": "metadata", "citations": [...], "retrieval_count": N}
    {"type": "token", "token": "token text"}
    {"type": "token", "token": " more"}
    {"type": "completion", "answer": "full answer", "confidence": 0.95, ...}
    {"type": "error", "error": "ErrorName", "message": "..."}
    ```
    
    Args:
        request: FastAPI Request (for rate limiting)
        query_input: RAGQueryRequest with query and patient_id
        current_user: Authenticated user ID (from JWT)
        
    Returns:
        StreamingResponse with NDJSON content
    """
    patient_id = query_input.patient_id
    query_text = query_input.query
    section_filter = query_input.section_filter
    top_k = min(query_input.top_k or 5, 10)  # Safety: max 10 results
    
    logger.info(
        f"RAG stream: user={current_user}, patient={patient_id}, "
        f"query_len={len(query_text)}"
    )
    
    async def stream_generator():
        """Generator for streaming response (v3.1 enhanced)"""
        start_time = time.time()
        retrieved_chunks_for_audit = []
        query_token_map = {}
        chunk_token_maps = []
        is_multi_patient = False
        query_classification = None
        accumulated_response = ""
        
        try:
            # STAGE 0: Validate inputs
            if len(query_text) < 3 or len(query_text) > 1000:
                error = {
                    "type": "error",
                    "error": "ValidationError",
                    "message": "Query must be 3-1000 characters"
                }
                yield json.dumps(error) + "\n"
                return
            
            # STAGE 1: Query Classification (v3.1 #9)
            logger.info("Stage 1: Classifying query...")
            try:
                classification_result = query_classifier.classify(query_text)
                query_classification = classification_result
                is_multi_patient = classification_result.get("is_multi_patient", False)
                needs_patient_filter = classification_result.get("needs_patient_filter", True)
                
                logger.info(
                    f"Query classified as: {classification_result['query_type'].value} "
                    f"(confidence: {classification_result['confidence']:.2f})"
                )
            except Exception as e:
                logger.error(f"Query classification failed: {str(e)}")
                # Continue without classification
                query_classification = {
                    "query_type": "general",
                    "is_multi_patient": False,
                    "needs_patient_filter": True,
                    "context_size": 10,
                }
            
            # STAGE 2: Mask Query (Optional v3.1 #1)
            masked_query_text = query_text
            logger.info("Stage 2: Masking query...")
            try:
                # If query contains patient names, mask them
                if any(word in query_text.lower() for word in ['patient', 'mr', 'ms', 'dr']):
                    mask_result = await pii_masking_service.mask_note(
                        text=query_text,
                        user_id=current_user,
                        patient_id=patient_id
                    )
                    masked_query_text = mask_result.masked_text
                    query_token_map = {m['token']: m['original'] for m in mask_result.masks_applied}
                    logger.debug(f"Query masked: {len(query_token_map)} tokens")
            except Exception as e:
                logger.warning(f"Query masking failed (continuing without masking): {e}")
                masked_query_text = query_text
            
            # STAGE 3: Embed masked query (v3.1 #8 - use masked)
            logger.info("Stage 3: Embedding query...")
            try:
                query_embedding = await embed_single(masked_query_text)
                if not query_embedding or len(query_embedding) != 768:
                    raise ValueError("Invalid embedding")
            except Exception as e:
                logger.error(f"Embedding failed: {str(e)}")
                error = {
                    "type": "error",
                    "error": "EmbeddingError",
                    "message": "Failed to generate query embedding"
                }
                yield json.dumps(error) + "\n"
                return
            
            # STAGE 4: Retrieve chunks with v3.1 improvements
            logger.info("Stage 4: Retrieving chunks...")
            try:
                # Use query classification for context sizing (v3.1 #9)
                context_size = query_classification.get("context_size", 10)
                retrieval_top_k = context_size * 5  # Retrieve more before reranking
                
                retrieved = await retrieve_chunks(
                    user_id=current_user,
                    patient_id=patient_id,
                    query_embedding=query_embedding,
                    top_k=retrieval_top_k,
                    section_filter=section_filter,
                    masking_confidence_threshold=0.7,  # v3.1 #7
                )
                
                if not retrieved:
                    logger.warning("No chunks retrieved for query")
                    error = {
                        "type": "error",
                        "error": "NotFound",
                        "message": "No matching medical records found for this query."
                    }
                    yield json.dumps(error) + "\n"
                    return
                
                logger.info(f"Retrieved {len(retrieved)} chunks")
                retrieved_chunks_for_audit = retrieved
            except Exception as e:
                logger.error(f"Retrieval failed: {str(e)}")
                error = {
                    "type": "error",
                    "error": "RetrievalError",
                    "message": "Failed to retrieve medical records"
                }
                yield json.dumps(error) + "\n"
                return
            
            # STAGE 5: Rerank chunks (v3.1 #6)
            logger.info("Stage 5: Reranking chunks...")
            try:
                retrieved_dicts = [
                    {
                        "id": r.chunk_id,
                        "chunk_id": r.chunk_id,
                        "note_id": r.note_id,
                        "section": r.section,
                        "text": r.text,
                        "chunk_text": r.text,
                        "similarity": r.final_score,
                        "similarity_score": r.similarity_score,
                        "masking_confidence": r.masking_confidence,
                        "timestamp": r.timestamp,
                        "patient_token": r.patient_token,
                    }
                    for r in retrieved
                ]
                
                # Use context_size for final top_k
                reranked = await rerank_chunks(
                    query=masked_query_text,
                    chunks=retrieved_dicts,
                    top_k=min(context_size, top_k),
                )
                logger.info(f"Reranked to {len(reranked)} chunks")
                
                # Collect chunk token maps (v3.1 #1)
                chunk_token_maps = [
                    {r.get("patient_token"): ""} if r.get("patient_token") else {}
                    for r in reranked
                ]
            except Exception as e:
                logger.error(f"Reranking failed: {str(e)}")
                error = {
                    "type": "error",
                    "error": "RerankingError",
                    "message": "Failed to rerank results"
                }
                yield json.dumps(error) + "\n"
                return
            
            # Yield metadata event (v3.1 streaming #1)
            metadata_event = {
                "type": "metadata",
                "retrieval_count": len(retrieved),
                "reranked_count": len(reranked),
                "query_type": query_classification.get("query_type", "unknown"),
                "is_multi_patient": is_multi_patient,
                "timestamps": {
                    "start": start_time,
                }
            }
            yield json.dumps(metadata_event) + "\n"
            
            # STAGE 6: Stream LLM response (v3.1 #2 - masked tokens only)
            logger.info("Stage 6: Streaming LLM response...")
            try:
                chunk_dicts = [
                    {
                        "chunk_id": r.chunk_id,
                        "note_id": r.note_id,
                        "section": r.section,
                        "text": r.text,
                        "reranking_score": r.combined_score if hasattr(r, 'combined_score') else r.final_score,
                        "timestamp": r.timestamp,
                        "masking_confidence": r.masking_confidence,
                    }
                    for r in reranked
                ]
                
                # Stream tokens from LLM
                async for token_event in stream_response(
                    query=masked_query_text,
                    context_chunks=chunk_dicts,
                    patient_info={"patient_id": patient_id},
                ):
                    accumulated_response += token_event.get("token", "")
                    yield json.dumps(token_event) + "\n"
                    
            except Exception as e:
                logger.error(f"LLM streaming failed: {str(e)}", exc_info=True)
                error = {
                    "type": "error",
                    "error": "LLMError",
                    "message": "Failed to generate response"
                }
                yield json.dumps(error) + "\n"
                return
            
            # STAGE 7: Post-process response (v3.1 #1, #2, #11)
            logger.info("Stage 7: Post-processing response...")
            try:
                # Combine token maps (v3.1 #1)
                from services.token_restoration import TokenRestorationService
                token_service = TokenRestorationService()
                combined_token_map = token_service.combine_token_maps(
                    query_token_map,
                    chunk_token_maps
                )
                
                # Process final response (token restoration + PII leak detection)
                processing_result = restore_response(
                    masked_response=accumulated_response,
                    token_map=combined_token_map,
                    validate_pii=True,  # v3.1 #11
                )
                
                unmasked_response = processing_result["unmasked_response"]
                pii_leaked = processing_result.get("pii_leaked", False)
                
                if pii_leaked:
                    logger.warning(f"⚠️ PII LEAK DETECTED: {processing_result.get('pii_issues', [])}")
                    
            except Exception as e:
                logger.error(f"Post-processing failed: {str(e)}", exc_info=True)
                unmasked_response = accumulated_response
                pii_leaked = False
            
            # STAGE 8: Calibrate confidence (v3.1 #10)
            logger.info("Stage 8: Calibrating confidence...")
            try:
                confidence_result = calibrate_confidence(
                    retrieved_chunks=[r.to_dict() for r in reranked] if reranked else []
                )
                final_confidence = confidence_result.get("calibrated_confidence", 0.5)
                confidence_factors = confidence_result.get("factors", {})
            except Exception as e:
                logger.error(f"Confidence calibration failed: {str(e)}")
                final_confidence = 0.5
                confidence_factors = {}
            
            # Yield completion event (v3.1 streaming #3)
            citations = [
                {
                    "chunk_id": r.chunk_id,
                    "note_id": r.note_id,
                    "section": r.section,
                    "timestamp": r.timestamp,
                }
                for r in reranked
            ]
            
            completion_event = {
                "type": "completion",
                "answer": unmasked_response,
                "citations": citations,
                "confidence": round(final_confidence, 3),
                "confidence_factors": confidence_factors,
                "processing_time_ms": int((time.time() - start_time) * 1000),
                "pii_leak_detected": pii_leaked,
            }
            yield json.dumps(completion_event) + "\n"
            
            # STAGE 9: Audit logging (v3.1 with multi-patient flagging)
            logger.info("Stage 9: Audit logging...")
            try:
                await log_rag_query(
                    user_id=current_user,
                    patient_id=patient_id,
                    query_text=masked_query_text,
                    retrieval_data={
                        "count": len(retrieved),
                        "masking_confidence_filtered": len([r for r in retrieved if r.masking_confidence < 0.7]),
                    },
                    reranking_data={"count": len(reranked)},
                    llm_data={"confidence": final_confidence},
                    response_data={
                        "confidence": final_confidence,
                        "confidence_factors": confidence_factors,
                        "pii_leaked": pii_leaked,
                    },
                    query_classification=query_classification,
                    is_multi_patient=is_multi_patient,  # v3.1 #5
                )
            except Exception as e:
                logger.warning(f"Audit logging failed: {e}")
            
            logger.info(f"✅ Stream complete for user={current_user}")
            
        except Exception as e:
            logger.error(f"Unexpected error in stream: {str(e)}", exc_info=True)
            error = {
                "type": "error",
                "error": "InternalError",
                "message": "An unexpected error occurred"
            }
            yield json.dumps(error) + "\n"
    
    return StreamingResponse(
        stream_generator(),
        media_type="application/x-ndjson"
    )


logger.info("✅ RAG routes registered")

