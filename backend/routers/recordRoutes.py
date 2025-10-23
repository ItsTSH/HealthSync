from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schema.recordSchema import RecordCreate, RecordResponse
from db.models import PatientRecord
from core.dependencies import get_db
from services.embeddings import generateEmbeddings, storeEmbeddings

router = APIRouter(prefix="/records", tags=["Records"])

@router.post("/", response_model=RecordResponse)
def create_record(record: RecordCreate, db: Session = Depends(get_db)):
    try:
        db_record = PatientRecord(**record.model_dump())
        db.add(db_record)
        db.commit()
        db.refresh(db_record)

        embedding_text = generateEmbeddings(record.model_dump())
        storeEmbeddings(db_record.id, embedding_text)

        return db_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))