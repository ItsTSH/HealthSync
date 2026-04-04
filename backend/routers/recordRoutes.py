"""Record routes - DEPRECATED

⚠️  DEPRECATION NOTICE
As of v0.2.0, all CRUD operations have been migrated to Supabase.
FastAPI is now a stateless AI processing layer only.

These endpoints are kept for backward compatibility but should NOT be used
for new development. Use Supabase client directly or call /process/note endpoint
for the new workflow.

This file will be removed in v1.0.0
"""
from fastapi import APIRouter, HTTPException, status
from schema.recordSchema import RecordCreate

router = APIRouter(prefix="/records", tags=["Records [DEPRECATED]"])


@router.post("/", deprecated=True, status_code=status.HTTP_410_GONE)
def create_record(record: RecordCreate):
    """
    ❌ DEPRECATED - Use Supabase directly
    
    This endpoint is no longer supported. 
    All CRUD operations should be performed directly with Supabase.
    """
    raise HTTPException(
        status_code=410,
        detail="Create record endpoint is deprecated. Use Supabase REST API directly."
    )


@router.get("/", deprecated=True, status_code=status.HTTP_410_GONE)
def getAllRecords(skip: int=0, limit: int = 10):
    """
    ❌ DEPRECATED - Use Supabase directly
    
    This endpoint is no longer supported.
    All CRUD operations should be performed directly with Supabase.
    """
    raise HTTPException(
        status_code=410,
        detail="Get records endpoint is deprecated. Use Supabase REST API directly."
    )
    

@router.get("/{record_uuid}", deprecated=True, status_code=status.HTTP_410_GONE)
def getRecordByID(record_uuid: str):
    """
    ❌ DEPRECATED - Use Supabase directly
    
    This endpoint is no longer supported.
    All CRUD operations should be performed directly with Supabase.
    """
    raise HTTPException(
        status_code=410,
        detail="Get record endpoint is deprecated. Use Supabase REST API directly."
    )
    

@router.put("/{record_uuid}", deprecated=True, status_code=status.HTTP_410_GONE)
def updateRecord(record_uuid: str, record_update):
    """
    ❌ DEPRECATED - Use Supabase directly
    
    This endpoint is no longer supported.
    All CRUD operations should be performed directly with Supabase.
    """
    raise HTTPException(
        status_code=410,
        detail="Update record endpoint is deprecated. Use Supabase REST API directly."
    )

    
@router.delete("/{record_uuid}", deprecated=True, status_code=status.HTTP_410_GONE)
def deleteRecord(record_uuid: str):
    """
    ❌ DEPRECATED - Use Supabase directly
    
    This endpoint is no longer supported.
    All CRUD operations should be performed directly with Supabase.
    """
    raise HTTPException(
        status_code=410,
        detail="Delete record endpoint is deprecated. Use Supabase REST API directly."
    )