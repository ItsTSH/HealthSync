import logging
import hashlib
import json
from core.initialization import embeddingModel, collection

logger = logging.getLogger(__name__)


def _generateEmbeddingsUnified(data: dict) -> str:
    """
    Generate embedding text from medical data (Supabase notes only).
    
    Combines all embeddable fields into a single text string suitable for
    semantic embeddings and similarity search.
    
    Args:
        data: Dictionary containing note fields from Supabase
        
    Returns:
        String combining all embeddable medical information for semantic search
        
    Raises:
        None (logs warning if no embeddable content found)
    """
    parts = []
    
    # Chief complaint (primary clinical focus - highest priority)
    if data.get('chiefComplaint'):
        parts.append(f"Chief Complaint: {data['chiefComplaint']}")
    
    # Symptoms (key clinical indicator)
    if data.get("symptoms"):
        parts.append(f"Symptoms: {data['symptoms']}")
    
    # Previous diagnosis history
    if data.get("previousDiagnosis"):
        parts.append(f"Previous Diagnosis: {data['previousDiagnosis']}")
    
    # Current medications
    if data.get("medication"):
        parts.append(f"Current Medications: {data['medication']}")
    
    # Previous medications (drug history)
    if data.get("previousMedications"):
        parts.append(f"Previous Medications: {data['previousMedications']}")
    
    # Allergies (critical safety info)
    if data.get("allergies"):
        parts.append(f"Allergies: {data['allergies']}")
    
    # Patient age (low weight demographic)
    if data.get("age") and data['age'] != 0:
        parts.append(f"Age: {data['age']}")
    
    embedding_text = " | ".join([p for p in parts if p.strip()])
    
    if not embedding_text.strip():
        logger.warning(f"No embeddable content found in note data")
    
    return embedding_text


def generateEmbeddingsForNote(note_data: dict) -> str:
    """
    Generate comprehensive embedding text for a Supabase note.
    
    Designed for RAG with all relevant clinical fields:
    - Chief complaint
    - Symptoms
    - Previous diagnosis
    - Current & previous medications
    - Allergies
    - Patient age
    
    Args:
        note_data: Normalized note data from Supabase
        
    Returns:
        Combined text string suitable for semantic embedding
    """
    return _generateEmbeddingsUnified(note_data)


def storeNoteEmbedding(note_id: str, embedding_text: str, note_data: dict):
    """
    Store note embedding in ChromaDB with full metadata
    
    Optimized for RAG with complete note information stored as metadata
    
    Args:
        note_id: UUID of the note in Supabase
        embedding_text: Combined text to embed
        note_data: Full normalized note data for metadata
        
    Raises:
        Exception: If embedding or storage fails
    """
    try:
        # Generate embedding vector
        embedding = embeddingModel.encode(embedding_text).tolist()
        
        # Prepare metadata - include all fields for RAG context
        metadata = {
            "note_id": note_id,
            "patientName": note_data.get("patientName", ""),
            "age": note_data.get("age", 0),
            "chiefComplaint": note_data.get("chiefComplaint", ""),
            "symptoms": note_data.get("symptoms", ""),
            "previousDiagnosis": note_data.get("previousDiagnosis", ""),
            "previousMedications": note_data.get("previousMedications", ""),
            "medication": note_data.get("medication", ""),
            "allergies": note_data.get("allergies", ""),
        }
        
        # Store in ChromaDB with note_id prefix for linking
        collection.add(
            ids=[f"note_{note_id}"],
            embeddings=[embedding],
            documents=[embedding_text],
            metadatas=[metadata]
        )
        
        logger.info(f"Successfully stored embedding for note {note_id} in ChromaDB")
    except Exception as e:
        logger.error(f"Error storing note embedding {note_id}: {str(e)}")
        raise


def compute_content_hash(note_data: dict) -> str:
    """
    Compute SHA256 hash of embeddable content to detect changes.
    
    Used to determine if a note's content has changed since last embedding.
    Only includes fields that affect embeddings (excludes metadata-only fields).
    
    Args:
        note_data: Note data dictionary
        
    Returns:
        Hex string of first 16 characters of SHA256 hash
        
    Example:
        hash1 = compute_content_hash(note1)  # "a1b2c3d4e5f6g7h8"
        hash2 = compute_content_hash(note2)
        
        if hash1 == hash2:
            print("Content unchanged, skip re-embedding")
        else:
            print("Content changed, regenerate embeddings")
    """
    try:
        # Extract only fields that affect embeddings
        embeddable_fields = {
            'chiefComplaint': note_data.get('chiefComplaint'),
            'symptoms': note_data.get('symptoms'),
            'previousDiagnosis': note_data.get('previousDiagnosis'),
            'medication': note_data.get('medication'),
            'previousMedications': note_data.get('previousMedications'),
            'allergies': note_data.get('allergies'),
        }
        
        # Serialize to JSON with sorted keys for consistent hashing
        content_str = json.dumps(embeddable_fields, sort_keys=True, default=str)
        
        # Compute SHA256 hash
        content_hash = hashlib.sha256(content_str.encode()).hexdigest()[:16]
        
        logger.debug(f"Computed content hash: {content_hash}")
        return content_hash
        
    except Exception as e:
        logger.error(f"Error computing content hash: {str(e)}")
        # Return empty hash on error (will force re-embedding)
        return ""
