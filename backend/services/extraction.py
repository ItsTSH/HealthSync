import json
from core.initialization import geminiClient
from google.genai import types

def extractMetadata(transcription: str) -> dict:
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

    data = json.loads(text)
    
    for key, val in data.items():
        if val == "NULL":
            data[key] = None
    
    return data