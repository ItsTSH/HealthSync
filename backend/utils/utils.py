def format_diarized_by_turn(transcription):
    result = []
    current_speaker = None
    buffer = []

    for word_info in transcription.words:
        speaker = word_info.speaker_id or "Unknown"
        word = word_info.text

        if speaker != current_speaker:
            if buffer:
                result.append(f"{current_speaker.capitalize()}: {' '.join(buffer)}")    #type:ignore
            current_speaker = speaker
            buffer = [word]
        else:
            buffer.append(word)

    if buffer:
        result.append(f"{current_speaker.capitalize()}: {' '.join(buffer)}")    #type:ignore
    return "/n".join(result)