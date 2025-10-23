from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schema.searchSchema import SearchQuery, SearchResult
from db.models import PatientRecord
from core.dependencies import get_db
from core.initialization import embeddingModel, collection
from schema.recordSchema import RecordResponse

router = APIRouter(prefix="/search", tags=["Search"])

@router.post("/", response_model=list[SearchResult])
def semanticSearch(search_query: SearchQuery, db: Session = Depends(get_db)):
    try:
        query_emb = embeddingModel.encode(search_query.query).tolist()
        results = collection.query(query_embeddings =[query_emb], n_results = search_query.top_k)
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