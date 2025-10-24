from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schema.recordSchema import RecordCreate, RecordResponse, RecordUpdate
from db.models import PatientRecord
from core.dependencies import get_db
from services.embeddings import generateEmbeddings, storeEmbeddings
from typing import List
from core.initialization import collection

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

@router.get("/", response_model=List[RecordResponse])
def getAllRecords(db: Session = Depends(get_db), skip: int=0, limit: int = 10):
    try:
        records = db.query(PatientRecord).offset(skip).limit(limit).all()
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/{record_id}", response_model=RecordResponse)
def getRecordByID(record_id: int, db: Session = Depends(get_db)):
    try:
        record = db.query(PatientRecord).filter(PatientRecord.id == record_id).first()
        if not record:
            raise HTTPException(status_code=404, detail=f"Record with {record_id} not found")
        return record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.put("/{record_id}", response_model=RecordResponse)
def updateRecord(record_id: int, record_update: RecordUpdate, db: Session = Depends(get_db)):
    try:
        db_record = db.query(PatientRecord).filter(PatientRecord.id == record_id).first()
        if not db_record:
            raise HTTPException(status_code=404, detail="Record not found")
        
        for field, value in record_update.model_dump(exclude_unset=True).items():
            setattr(db_record, field, value)
        
        db.commit()
        db.refresh(db_record)

        if any(f in record_update.model_dump(exclude_unset=True) for f in ["chiefComplaint", "symptoms", "previousDiagnosis", "previousMedications", "otherInfo"]):
            embedding_text = generateEmbeddings(record_update.model_dump(exclude_unset=True))
            storeEmbeddings(db_record.id, embedding_text)
        
        return db_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail = str(e))
    
@router.delete("/{record_id}", status_code=204)
def deleteRecord(record_id: int, db: Session = Depends(get_db)):
    try:
        db_record = db.query(PatientRecord).filter(PatientRecord.id == record_id).first()

        if not db_record:
            raise HTTPException(status_code=404, detail = "Record not found")
        
        db.delete(db_record)
        db.commit()

        collection.delete(ids=[f"record_{record_id}"])

        return {"message": f"Record {record_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail = str(e))