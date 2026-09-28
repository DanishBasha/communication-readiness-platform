"""
STT Service — Groq Whisper transcription.

Accepts raw audio bytes (WAV), writes to a temp file, calls Groq
whisper-large-v3-turbo, and returns the transcript string.

Returns an empty string on any failure; the caller is responsible for
handling the fallback (Node.js surfaces the raw audio text to the student
in such cases).
"""
from __future__ import annotations

import os
import tempfile

from groq import AsyncGroq

from app.config import settings


async def transcribe(audio_bytes: bytes, language: str = "en") -> str:
    """
    Transcribe audio bytes via Groq Whisper.

    Args:
        audio_bytes: Raw WAV audio data.
        language: BCP-47 language tag. Defaults to "en".

    Returns:
        Cleaned transcript string, or "" on failure.
    """
    if not audio_bytes:
        return ""

    if not settings.groq_api_key:
        # No key configured — return empty so Node.js can use the typed fallback
        return ""

    client = AsyncGroq(api_key=settings.groq_api_key)

    # Write to a named temp file — Groq SDK requires a real file object
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    try:
        with open(tmp_path, "rb") as audio_file:
            response = await client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3-turbo",
                language=language,
                response_format="json",
            )
        return response.text.strip()
    except Exception as e:
        print(f"[STT] transcription error: {e}")
        return ""
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
