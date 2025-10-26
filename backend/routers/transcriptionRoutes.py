from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import tempfile, os, json
from schema.transcriptionSchema import TranscriptionResponse
from db.models import User
from services.authService import getCurrentUser
from services.transcription import transcribeAudio
from services.extraction import extractMetadata
import re

router = APIRouter(prefix="/transcribe", tags=["Transcription"])

@router.post("/", response_model=TranscriptionResponse)
async def transcribeEndpoint(audio_file: UploadFile = File(...), current_user: User = Depends(getCurrentUser)):
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
           
            # Extract metadata using cleaned text
            extracted = extractMetadata(transcription=clean_transcription)
            
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
            
            return TranscriptionResponse(
                transcription=clean_transcription,  # Original, unmodified
                extractedMetadata=json.dumps(extracted, indent=2)
            )
        finally:
            os.unlink(path)
            
    except Exception as e:
        import traceback
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))