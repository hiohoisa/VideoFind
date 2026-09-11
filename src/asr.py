"""Local Whisper speech recognition with timestamped output."""

from pathlib import Path


def transcribe_audio(audio_path: str | Path, model_name: str = "base") -> list[dict]:
    """Transcribe audio into start/end/text dictionaries using local Whisper."""
    try:
        import whisper
    except ImportError as exc:
        raise RuntimeError("openai-whisper is required for videos without subtitles") from exc

    model = whisper.load_model(model_name)
    result = model.transcribe(str(audio_path), verbose=False)
    return [
        {
            "start": float(segment["start"]),
            "end": float(segment["end"]),
            "text": str(segment["text"]).strip(),
        }
        for segment in result.get("segments", [])
        if str(segment.get("text", "")).strip()
    ]
