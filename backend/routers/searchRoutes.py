from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schema.searchSchema import SearchQuery, SearchResult
from db.models import PatientRecord
from core.dependencies import get_db
from core.initialization import embeddingModel, collection
from schema.recordSchema import RecordResponse

router = APIRouter(prefix="/search", tags=["Search"])

@router.post("/", response_model=list[SearchResult])
def semanticSearch(search_input: SearchQuery, db: Session = Depends(get_db)):
    try:
        if search_input.query and not search_input.record_id:
            query_text = search_input.query

        elif search_input.record_id:
            record = db.query(PatientRecord).get(PatientRecord.id == search_input.record_id)
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

        for i, record_id_str in enumerate(results["ids"][0]):
            record_id = int(record_id_str.split("_")[1])
            record = db.query(PatientRecord).get(record_id)
            if record:
                output.append(SearchResult(
                    record = RecordResponse.model_validate(record),
                    similarityScore=1-results["distances"][0][i],   # type: ignore
                    matchedText = results["documents"][0][i]    #type:ignore
                ))
        return output
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))