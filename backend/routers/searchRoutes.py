"""Semantic search routes with RAG support via ChromaDB + Supabase"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from schema.searchSchema import SearchQuery, NoteSearchResult
from core.initialization import embeddingModel, collection
from core.auth import get_current_user
from core.rate_limit import limiter, LIMITS
from services.supabaseService import fetch_note

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Search"])

@router.post("/notes", response_model=list[NoteSearchResult])
@limiter.limit(LIMITS["search"])
async def semanticSearchNotes(
    request: Request,
    search_input: SearchQuery = Body(...),
    current_user: str = Depends(get_current_user)
) -> list[NoteSearchResult]:
    """
    Semantic search for notes stored in Supabase + ChromaDB
    
    🔐 Requires authentication
    
    NEW endpoint optimized for RAG. Searches ChromaDB embeddings and
    fetches full note data from Supabase for enriched results.
    
    💾 CACHING STRATEGY:
    - Each searched note uses Redis cache-aside pattern (10min TTL + jitter)
    - Null result caching: If note deleted, cached 404 for 60s to prevent repeated lookups
    - Hot key protection: Popular notes in search results get extended TTL
    - Cache invalidation: Automatic when notes are updated
    - Redis failure: System gracefully falls back to direct Supabase fetches
    
    Args:
        request: FastAPI Request object (required by slowapi rate limiter)
        search_input: SearchQuery with query or note_id
        current_user: Authenticated user ID (from JWT token)
        
    Returns:
        List of NoteSearchResult with full note data and similarity scores
        
    Raises:
        HTTPException: If query is invalid or search fails
    """
    try:
        # Build query text
        if search_input.query and not search_input.note_id:
            query_text = search_input.query
            logger.info(f"Searching with text query: {query_text[:50]}...")
            
        elif search_input.note_id:
            # Fetch note from Supabase (with caching) to build query
            note = await fetch_note(search_input.note_id)
            if not note:
                raise HTTPException(
                    status_code=404,
                    detail=f"Note {search_input.note_id} not found"
                )
            
            # Build query from note fields
            query_parts = []
            if note.get("chiefComplaint"):
                query_parts.append(note["chiefComplaint"])
            if note.get("symptoms"):
                query_parts.append(note["symptoms"])
            if note.get("previousDiagnosis"):
                query_parts.append(note["previousDiagnosis"])
            if note.get("previousMedications"):
                query_parts.append(note["previousMedications"])
            
            query_text = " ".join(query_parts)
            
            if not query_text.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Note has no searchable fields"
                )
            
            logger.info(f"Searching similar notes to note {search_input.note_id}")
        else:
            raise HTTPException(
                status_code=400,
                detail="Provide either 'query' or 'note_id'"
            )
        
        # Generate embedding for query
        query_embedding = embeddingModel.encode(query_text).tolist()
        
        # Search ChromaDB
        logger.info(f"Querying ChromaDB with top_k={search_input.top_k}")
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=search_input.top_k,
            where={"note_id": {"$exists": True}}  # Only return note results
        )
        
        if not results or not results["ids"] or not results["ids"][0]:
            logger.info("No results found in ChromaDB")
            return []
        
        output = []
        for i, embedding_id in enumerate(results["ids"][0]):
            try:
                # Extract note_id from embedding ID (format: note_{uuid})
                # Split by underscore and rejoin remaining parts (UUIDs may contain underscores)
                parts = embedding_id.split("_", 1)
                if len(parts) < 2:
                    logger.warning(f"Invalid embedding ID format: {embedding_id}")
                    continue
                
                note_id = parts[1]  # Keep as string UUID
                
                # Fetch full note from Supabase (with caching + null result caching)
                note_data = await fetch_note(note_id)
                if not note_data:
                    logger.debug(f"Note {note_id} not found in Supabase or cached as null, skipping")
                    continue
                
                # Calculate similarity (ChromaDB returns distance, not similarity)
                similarity_score = 1 - results["distances"][0][i]
                
                output.append(NoteSearchResult(
                    note_id=note_id,
                    note_data=note_data,
                    similarity_score=similarity_score,
                    matched_text=results["documents"][0][i]
                ))
                
            except (ValueError, IndexError, AttributeError) as e:
                logger.warning(f"Error parsing result {embedding_id}: {str(e)}")
                continue
        
        logger.info(f"Returned {len(output)} results")
        return output
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in notes search: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Search error: {str(e)}"
        )
