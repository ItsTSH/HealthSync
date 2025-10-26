from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schema.recordSchema import RecordCreate, RecordResponse, RecordUpdate
from db.models import PatientRecord, User
from core.dependencies import get_db
from services.embeddings import generateEmbeddings, storeEmbeddings
from services.authService import getCurrentUser
from typing import List
from core.security import decryptValues, encryptValues
from core.initialization import collection
from uuid import uuid4

router = APIRouter(prefix="/records", tags=["Records"])

# Helper to decrypt record before sending to frontend
def decrypt_record(record: PatientRecord) -> PatientRecord:
    record.patientName = decryptValues(record.patientName)
    record.gender = decryptValues(record.gender)
    return record

@router.post("/", response_model=RecordResponse)
def create_record(record: RecordCreate, current_user: User = Depends(getCurrentUser), db: Session = Depends(get_db)):
    try:
        record_uuid = uuid4()
        # Encrypt sensitive fields
        db_record = PatientRecord(
            uuid= record_uuid,
            patientName=encryptValues(record.patientName),
            age=record.age,
            gender=encryptValues(record.gender),
            chiefComplaint=record.chiefComplaint,
            symptoms=record.symptoms,
            previousDiagnosis=record.previousDiagnosis,
            previousMedications=record.previousMedications,
            otherInfo=record.otherInfo,
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)

        embedding_text = generateEmbeddings(record.model_dump())
        storeEmbeddings(str(db_record.uuid), embedding_text)

        return decrypt_record(db_record)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[RecordResponse])
def getAllRecords(db: Session = Depends(get_db), current_user: User = Depends(getCurrentUser), skip: int=0, limit: int = 10):
    try:
        records = db.query(PatientRecord).offset(skip).limit(limit).all()
        return [decrypt_record(r) for r in records]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/{record_uuid}", response_model=RecordResponse)
def getRecordByID(record_uuid: str, current_user: User = Depends(getCurrentUser), db: Session = Depends(get_db)):
    try:
        record = db.query(PatientRecord).filter(PatientRecord.uuid == record_uuid).first()
        if not record:
            raise HTTPException(status_code=404, detail=f"Record with {record_uuid} not found")
        return decrypt_record(record)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.put("/{record_uuid}", response_model=RecordResponse)
def updateRecord(record_uuid: str, record_update: RecordUpdate, current_user: User = Depends(getCurrentUser), db: Session = Depends(get_db)):
    try:
        db_record = db.query(PatientRecord).filter(PatientRecord.uuid == record_uuid).first()
        if not db_record:
            raise HTTPException(status_code=404, detail="Record not found")
        
        for field, value in record_update.model_dump(exclude_unset=True).items():
            if field in ["patientName", "gender"]:
                setattr(db_record, field, encryptValues(value))
            else:
                setattr(db_record, field, value)
        
        db.commit()
        db.refresh(db_record)

        if any(f in record_update.model_dump(exclude_unset=True) for f in ["chiefComplaint", "symptoms", "previousDiagnosis", "previousMedications", "otherInfo"]):
            embedding_text = generateEmbeddings(record_update.model_dump(exclude_unset=True))
            storeEmbeddings(db_record.id, embedding_text)
        
        return decrypt_record(db_record)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail = str(e))
    
@router.delete("/{record_uuid}", status_code=200)
def deleteRecord(record_uuid: str, current_user: User = Depends(getCurrentUser), db: Session = Depends(get_db)):
    try:
        db_record = db.query(PatientRecord).filter(PatientRecord.uuid == record_uuid).first()

        if not db_record:
            raise HTTPException(status_code=404, detail = "Record not found")
        
        db.delete(db_record)
        db.commit()

        collection.delete(ids=[f"record_{record_uuid}"])

        return {"message": f"Record {record_uuid} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail = str(e))