from core.initialization import embeddingModel, collection

def generateEmbeddings(record_data: dict) -> str:
    parts = [f"Chief Complaint: {record_data['chiefComplaint']}"]
    if record_data.get("Symptoms"):
        parts.append(f"Symptoms: {record_data['symptoms']}")
    if record_data.get("previousDiagnosis"):
        parts.append(f"Diagnosis: {record_data['previousDiagnosis']}")
    if record_data.get("previousMedications"):
        parts.append(f"Medications: {record_data['previousMedications']}")
    if record_data.get("otherInfo"):
        parts.append(f"Other Info: {record_data['otherInfo']}")
    
    return " | ".join(parts)

def storeEmbeddings(record_id: int, embeddingText: str):
    embedding = embeddingModel.encode(embeddingText).tolist()
    collection.add(
        ids = [f"record_{record_id}"],
        embeddings = [embedding],
        documents=[embeddingText],
        metadatas=[{"record_id": record_id}]
    )