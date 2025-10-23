from core.initialization import elevenClient
from utils.utils import format_diarized_by_turn

def transcribeAudio(file_path: str) -> str:
    with open(file_path, "rb") as f:
        transcription = elevenClient.speech_to_text.convert(
            file=f,
            model_id="scribe_v1",
            tag_audio_events=True,
            language_code="en",
            diarize=True
        )
    formatted_text = format_diarized_by_turn(transcription)
    
    return "\n".join(formatted_text)