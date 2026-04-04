import logging
from core.initialization import embeddingModel, collection

logger = logging.getLogger(__name__)


def generateEmbeddings(record_data: dict) -> str:
    """
    Generate embedding text from record data
    
    Legacy function for backward compatibility.
    Builds text from multiple fields for comprehensive embeddings.
    
    Args:
        record_data: Dictionary containing medical record fields
        
    Returns:
        String combining all medical information for embedding
    """
    parts = []
    
    # Chief complaint (highest priority)
    if record_data.get('chiefComplaint'):
        parts.append(f"Chief Complaint: {record_data['chiefComplaint']}")
    
    # Symptoms
    if record_data.get("symptoms"):
        parts.append(f"Symptoms: {record_data['symptoms']}")
    
    # Previous diagnosis
    if record_data.get("previousDiagnosis"):
        parts.append(f"Previous Diagnosis: {record_data['previousDiagnosis']}")
    
    # Previous medications
    if record_data.get("previousMedications"):
        parts.append(f"Previous Medications: {record_data['previousMedications']}")
    
    # Current medications
    if record_data.get("medication"):
        parts.append(f"Current Medications: {record_data['medication']}")
    
    # Allergies
    if record_data.get("allergies"):
        parts.append(f"Allergies: {record_data['allergies']}")
    
    # Age (optional, low weight but useful)
    if record_data.get("age") and record_data['age'] != 0:
        parts.append(f"Age: {record_data['age']}")
    
    # Other info if present
    if record_data.get("otherInfo"):
        parts.append(f"Other Info: {record_data['otherInfo']}")
    
    embedding_text = " | ".join([p for p in parts if p.strip()])
    
    if not embedding_text.strip():
        logger.warning("No embeddable content found in record data")
    
    return embedding_text


def generateEmbeddingsForNote(note_data: dict) -> str:
    """
    Generate comprehensive embedding text for a note from Supabase
    
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
    parts = []
    
    # Chief complaint (primary clinical focus)
    if note_data.get('chiefComplaint'):
        parts.append(f"Chief Complaint: {note_data['chiefComplaint']}")
    
    # Symptoms (key clinical indicator)
    if note_data.get("symptoms"):
        parts.append(f"Symptoms: {note_data['symptoms']}")
    
    # Previous diagnosis history
    if note_data.get("previousDiagnosis"):
        parts.append(f"Previous Diagnosis: {note_data['previousDiagnosis']}")
    
    # Current medications
    if note_data.get("medication"):
        parts.append(f"Current Medications: {note_data['medication']}")
    
    # Previous medications (drug history)
    if note_data.get("previousMedications"):
        parts.append(f"Previous Medications: {note_data['previousMedications']}")
    
    # Allergies (critical safety info)
    if note_data.get("allergies"):
        parts.append(f"Allergies: {note_data['allergies']}")
    
    # Patient age (low weight demographic)
    if note_data.get("age") and note_data['age'] != 0:
        parts.append(f"Age: {note_data['age']}")
    
    embedding_text = " | ".join([p for p in parts if p.strip()])
    
    if not embedding_text.strip():
        logger.warning("No embeddable content found in note data")
    
    return embedding_text


def storeEmbeddings(record_uuid: str, embeddingText: str, metadata: dict = None):
    """
    Store embedding in ChromaDB with metadata
    
    Legacy function for backward compatibility.
    
    Args:
        record_uuid: UUID of the record
        embeddingText: Text to embed
        metadata: Optional metadata dict
    """
    try:
        embedding = embeddingModel.encode(embeddingText).tolist()
        meta = metadata or {"record_id": str(record_uuid)}
        
        collection.add(
            ids=[f"record_{record_uuid}"],
            embeddings=[embedding],
            documents=[embeddingText],
            metadatas=[meta]
        )
        logger.info(f"Successfully stored embedding for record {record_uuid}")
    except Exception as e:
        logger.error(f"Error storing embedding for record {record_uuid}: {str(e)}")
        raise


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
