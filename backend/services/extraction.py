import json
import asyncio
from core.initialization import geminiClient
from google.genai import types

async def extractMetadata(transcription: str) -> dict:
    """
    Asynchronously extract medical metadata from transcription.
    
    Uses asyncio.to_thread() to wrap the blocking Gemini API call,
    preventing event loop blocking during LLM inference.
    
    Args:
        transcription: Cleaned medical transcription text
        
    Returns:
        Dictionary with extracted medical metadata fields
        
    Raises:
        ValueError: If API response is empty or invalid
    """
    instruction = """
    You are a medical transcription assistant.
    Extract these details as JSON. DO NOT CHANGE THE STRUCTURE OR LABELS OF THE JSON IN ANY WAY:
    - patientName (string)
    - age (number)
    - gender (string - e.g., "M", "F", "Other", or the full word)
    - chiefComplaint (string)
    - symptoms (string)
    - previousDiagnosis (string or null)
    - previousMedications (string or null)
    - bloodPressure (number or null - systolic reading)
    - heartRate (number or null - beats per minute)
    - temperature (number or null - in Celsius)
    - allergies (string or null)
    - medication (string or null - current medications)
    - diagnosis (string or null)
    
    For numeric fields (age, bloodPressure, heartRate, temperature), extract the number value only.
    For null fields, return null if information is not mentioned in the transcription.
    """

    # Wrap blocking Gemini API call in thread pool to avoid blocking event loop
    def _call_gemini():
        response = geminiClient.models.generate_content(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=instruction,
                response_mime_type="application/json"
            ),
            contents=transcription
        )
        
        text = response.text
        print(f"Response text type: {type(text)}")
        print(f"Response text value: {text}")
        
        if text is None:
            raise ValueError("No text content in response")
        
        return text

    # Execute blocking call asynchronously
    text = await asyncio.to_thread(_call_gemini)
    
    # Parse JSON response
    data = json.loads(text)
    
    # Convert "NULL" strings to actual None values
    for key, val in data.items():
        if val == "NULL":
            data[key] = None
    
    return data