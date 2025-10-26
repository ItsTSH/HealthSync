import json
from core.initialization import geminiClient
from google.genai import types

def extractMetadata(transcription: str) -> dict:
    instruction = """
    You are a medical transcription assistant.
    Extract these details as JSON. DO NOT CHANGE THE STRUCTURE OR LABELS OF THE JSON IN ANY WAY:
    - patientName
    - age
    - gender
    - chiefComplaint
    - symptoms
    - previousDiagnosis
    - previousMedications
    - otherInfo
    """

    response = geminiClient.models.generate_content(
        model = "gemini-2.5-flash",
        config = types.GenerateContentConfig(
            system_instruction = instruction,
            response_mime_type= "application/json"
        ),
        contents=transcription)
    
    text = response.text
    print(f"Response text type: {type(text)}")
    print(f"Response text value: {text}")
    if text is None:
        raise ValueError("No text content in response")
    if text is None:
        raise ValueError("No text content in response")
    
    data = json.loads(text)
    
    for key, val in data.items():
        if val == "NULL":
            data[key] = None
    
    return data