from core.initialization import elevenClient
from utils.utils import format_diarized_by_turn

def transcribeAudio(file_path: str) -> str:
    print(f"Opening file: {file_path}")
    print(f"file_path type: {type(file_path)}")
    with open(file_path, "rb") as f:
        print("File opened, calling API...")
        transcription = elevenClient.speech_to_text.convert(
            file=f,
            model_id="scribe_v1",
            tag_audio_events=True,
            language_code="en",
            diarize=True
        )
        print(f"Transcription type: {type(transcription)}")
        print(f"Transcription value: {transcription}")
    print("Formatting transcription...")
    formatted_text = format_diarized_by_turn(transcription)
    print(f"Formatted text type: {type(formatted_text)}")
    
    return "\n".join(formatted_text)