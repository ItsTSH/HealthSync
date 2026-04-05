"""Semantic search routes with RAG support via ChromaDB + Supabase"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schema.searchSchema import SearchQuery, NoteSearchResult, SearchResult
from db.models import PatientRecord, User
from core.dependencies import get_db
from core.security import decryptValues
from core.initialization import embeddingModel, collection
from core.auth import get_current_user
from services.supabaseService import fetch_note
from typing import List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Search"])


# Helper to decrypt record before sending to frontend
def decrypt_record(record: PatientRecord) -> PatientRecord:
    """Decrypt sensitive fields in record"""
    record.patientName = decryptValues(record.patientName)
    record.gender = decryptValues(record.gender)
    return record


@router.post("/", response_model=list[SearchResult])
def semanticSearch(
    search_input: SearchQuery,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Legacy semantic search endpoint (backward compatibility)
    
    🔐 Requires authentication
    
    Searches ChromaDB for similar records and retrieves from PostgreSQL.
    Will be gradually replaced by /search/notes endpoint.
    
    Args:
        search_input: SearchQuery with query or record_uuid
        db: Database session
        
    Returns:
        List of SearchResult with matched records
    """
    try:
        if search_input.query and not search_input.record_uuid:
            query_text = search_input.query

        elif search_input.record_uuid:
            record = db.query(PatientRecord).filter(PatientRecord.uuid == search_input.record_uuid).first()
            if not record:
                raise HTTPException(status_code=404, detail="Record Not Found")
        
            query_dict = {
                "chiefComplaint": record.chiefComplaint,
                "symptoms": record.symptoms,
                "previousDiagnosis": record.previousDiagnosis,
                "previousMedications": record.previousMedications,
            }
            query_text = " ".join(
                str(v) for v in query_dict.values() if v is not None
            )

            if not query_text.strip():
                raise HTTPException(status_code=400, detail="No searchable data in record")

        else:
            raise HTTPException(status_code=400, detail="Provide either 'query' or 'record_id")    

        query_emb = embeddingModel.encode(query_text).tolist()
        results = collection.query(query_embeddings =[query_emb], n_results = search_input.top_k)
        assert results is not None, "Query returned None"
        
        output = []
        if not results["ids"] or not results["ids"][0]:
            return []  # no results

        for i, record_id_str in enumerate(results["ids"][0]):
            record_uuid = record_id_str.split("_")[1]
            record = db.query(PatientRecord).filter(PatientRecord.uuid == record_uuid).first()
            if record:
                decrypted_record = decrypt_record(record)
                output.append(SearchResult(
                    record = decrypted_record.model_dump(),
                    similarityScore=1-results["distances"][0][i],   # type: ignore
                    matchedText = results["documents"][0][i]    #type:ignore
                ))
        return output
    except Exception as e:
        logger.error(f"Error in semantic search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notes", response_model=list[NoteSearchResult])
async def semanticSearchNotes(
    search_input: SearchQuery,
    current_user: str = Depends(get_current_user)
) -> list[NoteSearchResult]:
    """
    Semantic search for notes stored in Supabase + ChromaDB
    
    🔐 Requires authentication
    
    NEW endpoint optimized for RAG. Searches ChromaDB embeddings and
    fetches full note data from Supabase for enriched results.
    Uses Redis caching for note fetches.
    
    Args:
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
                # Extract note_id from embedding ID (format: note_{id})
                note_id = int(embedding_id.split("_")[1])
                
                # Fetch full note from Supabase (with caching)
                note_data = await fetch_note(note_id)
                if not note_data:
                    logger.warning(f"Note {note_id} not found in Supabase, skipping")
                    continue
                
                # Calculate similarity (ChromaDB returns distance, not similarity)
                similarity_score = 1 - results["distances"][0][i]
                
                output.append(NoteSearchResult(
                    note_id=note_id,
                    note_data=note_data,
                    similarity_score=similarity_score,
                    matched_text=results["documents"][0][i]
                ))
                
            except (ValueError, IndexError) as e:
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
