import json
from core.initialization import geminiClient
from google.genai import types

def extractMetadata(transcription: str) -> dict:
    instruction = """
    You are a medical transcription assistant.
    Extract these details as JSON:
    - patient_name
    - age
    - gender
    - chief_complaint
    - previous_diagnosis
    - previous_medications
    - other_info
    """

    response = geminiClient.models.generate_content(
        model = "gemini-1.5-flash",
        config = types.GenerateContentConfig(
            system_instruction = instruction,
            response_mime_type= "applications/json"
        ),
        contents=transcription)
    
    text = response.text
    if text is None:
        raise ValueError("No text content in response")
    
    data = json.loads(text)
    
    for key, val in data.items():
        if val == "NULL":
            data[key] = None
    
    return data