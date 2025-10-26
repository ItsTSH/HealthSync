from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import tempfile, os, json
from schema.transcriptionSchema import TranscriptionResponse
from db.models import User
from services.authService import getCurrentUser
from services.transcription import transcribeAudio
from services.extraction import extractMetadata

router = APIRouter(prefix="/transcribe", tags=["Transcription"])

@router.post("/", response_model = TranscriptionResponse)
async def transcribeEndpoint(audio_file: UploadFile = File(...), current_user: User = Depends(getCurrentUser)):
    try:
        if not audio_file:
            raise HTTPException(status_code=500, detail="No Audio File Found")
    
        if not audio_file.content_type.startswith("audio/"):    #type:ignore
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        suffix, _ = os.path.splitext(os.path.basename(audio_file))  #type:ignore
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await audio_file.read())
            path = tmp.name
        
        try:
            transcription = transcribeAudio(path)
            extracted = extractMetadata(transcription=transcription)
            return TranscriptionResponse(transcription=transcription, extractedMetadata=json.dumps(extracted, indent=2))
        finally:
            os.unlink(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))