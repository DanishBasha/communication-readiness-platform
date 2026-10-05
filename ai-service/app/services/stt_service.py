"""
STT Service — Groq Whisper transcription.

Accepts raw audio bytes (WAV), calls Groq whisper-large-v3-turbo via a
module-level singleton client (avoids per-call TCP/TLS handshake overhead),
and returns the transcript string.

Returns an empty string on any failure; the caller is responsible for
handling the fallback (Node.js surfaces the raw audio text to the student
in such cases).
"""
from __future__ import annotations

from io import BytesIO

from groq import AsyncGroq

from app.config import settings

# Fix 2: module-level singleton — eliminates new TCP/TLS conn per call (~50–200ms)
_groq_client: AsyncGroq | None = None


def _get_groq_client() -> AsyncGroq:
    global _groq_client
    if _groq_client is None:
        _groq_client = AsyncGroq(api_key=settings.groq_api_key)
    return _groq_client


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

    # Fix 9: BytesIO instead of NamedTemporaryFile — eliminates 2 disk I/O ops per call
    audio_file = BytesIO(audio_bytes)
    audio_file.name = "audio.wav"  # Groq SDK reads .name for content-type detection

    try:
        response = await _get_groq_client().audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3-turbo",
            language=language,
            response_format="json",
        )
        return response.text.strip()
    except Exception as e:
        print(f"[STT] transcription error: {e}")
        return ""
