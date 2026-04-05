from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
import tempfile, os, json, logging, re
from schema.transcriptionSchema import TranscriptionResponse
from services.transcription import transcribeAudio
from services.extraction import extractMetadata
from core.auth import get_current_user
from core.rate_limit import limiter, LIMITS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transcribe", tags=["Transcription"])


@router.post("/", response_model=TranscriptionResponse)
@limiter.limit(LIMITS["transcribe"])
async def transcribeEndpoint(
    request: Request,
    audio_file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    """
    Transcribe audio file to text
    
    🔐 Requires authentication (Bearer token in Authorization header)
    """
    logger.info(f"[transcribeEndpoint] Request from user: {current_user}")
    logger.info(f"[transcribeEndpoint] File: {audio_file.filename}, Content-Type: {audio_file.content_type}")
    
    try:
        if not audio_file:
            raise HTTPException(status_code=500, detail="No Audio File Found")
   
        if not audio_file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="File must be an audio file")
       
        if not audio_file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")
           
        suffix = os.path.splitext(audio_file.filename)[1]
       
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio_file.read()
            tmp.write(content)
            path = tmp.name
       
        try:
            transcription = transcribeAudio(path)
           
            # Clean transcription: remove newlines, collapse spaces
            clean_transcription = re.sub(r'\s+', ' ', transcription.replace('\n', '')).strip()
           
            # Extract metadata using cleaned text (now async - await the call)
            extracted = await extractMetadata(transcription=clean_transcription)
            
            # Clean up extracted metadata values
            for key, value in extracted.items():
                if isinstance(value, str):
                    # Remove extra whitespace and clean up the text
                    extracted[key] = re.sub(r'\s+', ' ', value).strip()
            
            # Convert age to integer if possible
            if 'age' in extracted and extracted['age']:
                age_match = re.search(r'\d+', str(extracted['age']))
                if age_match:
                    extracted['age'] = int(age_match.group(0))
            # Normalize keys and return as dict, not string
            extracted_normalized = {
                "patientName": extracted.get("patientName"),
                "age": extracted.get("age"),
                "gender": extracted.get("gender"),
                "chiefComplaint": extracted.get("chiefComplaint"),
                "symptoms": extracted.get("symptoms"),
                "previousDiagnosis": extracted.get("previousDiagnosis"),
                "previousMedications": extracted.get("previousMedications"),
                "bloodPressure": extracted.get("bloodPressure"),
                "heartRate": extracted.get("heartRate"),
                "temperature": extracted.get("temperature"),
                "allergies": extracted.get("allergies"),
                "medication": extracted.get("medication"),
                "diagnosis": extracted.get("diagnosis"),
            }
            return TranscriptionResponse(
                # transcription=clean_transcription,  # Original, unmodified
                extractedMetadata=extracted_normalized
            )
        finally:
            os.unlink(path)
            
    except Exception as e:
        import traceback
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))