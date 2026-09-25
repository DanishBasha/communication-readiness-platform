"""
Audio Analyzer Service.

Two separate concerns intentionally split into separate callables:

1. analyze_signal(audio_bytes) — async, waveform-based metrics only.
   Runs in Stage 1 in parallel with STT (does NOT need the transcript).
   Computes: pace proxy from speech-frame ratio, fluency from signal variance.

2. count_fillers(transcript) — sync, transcript-based.
   Runs in Stage 3 after STT completes.
   Returns filler count and updates the AudioMetrics object.

This split matches the W2 architecture: Stage 1 is STT ∥ signal analysis,
Stage 3 merges transcript-derived metrics after LLM completes.
"""
from __future__ import annotations

import io

import librosa
import numpy as np
from pydantic import BaseModel


# ── Output model ──────────────────────────────────────────────────────────────

class AudioMetrics(BaseModel):
    pace_wpm: float = 0.0
    filler_count: int = 0
    fluency_score: float = 0.0
    clarity_score: float = 0.0


# ── Filler word list ──────────────────────────────────────────────────────────

FILLER_WORDS: frozenset[str] = frozenset({
    "um", "uh", "like", "you know", "basically", "literally",
    "actually", "so", "right", "okay", "well", "i mean",
})


# ── Stage 1: signal-only analysis (no transcript) ─────────────────────────────

async def analyze_signal(audio_bytes: bytes) -> AudioMetrics:
    """
    Compute waveform-based metrics from raw audio bytes.
    Does NOT require the transcript — safe to run in parallel with STT.

    Pace is estimated from speech-active frame ratio and typical English WPM
    when we don't yet have the word count. The caller updates pace_wpm once
    the transcript arrives (see count_fillers / finalize_metrics).

    Fluency is derived from the short-term energy variance: high variance
    (lots of loudness swings) correlates with disfluency or fragmented speech.
    """
    if not audio_bytes:
        return AudioMetrics()

    try:
        y, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
        duration_sec = librosa.get_duration(y=y, sr=sr)

        if duration_sec < 0.1:
            return AudioMetrics()

        # Voice activity: fraction of frames above RMS threshold
        rms = librosa.feature.rms(y=y, frame_length=512, hop_length=160)[0]
        noise_floor = np.percentile(rms, 10)
        speech_frames = np.sum(rms > noise_floor * 3)
        speech_ratio = speech_frames / max(len(rms), 1)

        # Rough pace proxy before transcript is available:
        # average English spoken pace is ~130 WPM; scale by speech_ratio
        pace_proxy_wpm = round(130.0 * speech_ratio, 1)

        # Fluency from short-term energy variance (lower variance = smoother speech)
        energy_std = float(np.std(rms))
        energy_mean = float(np.mean(rms)) + 1e-9
        cv = energy_std / energy_mean  # coefficient of variation
        # CV around 0.5–0.8 is typical; penalise extreme values
        fluency_score = max(0.0, min(100.0, 100.0 - max(0.0, cv - 0.5) * 60.0))

        return AudioMetrics(
            pace_wpm=pace_proxy_wpm,
            filler_count=0,  # filled in Stage 3
            fluency_score=round(fluency_score, 1),
            clarity_score=100.0,  # updated in Stage 3 once filler_count is known
        )

    except Exception as e:
        print(f"[AudioAnalyzer] analyze_signal error: {e}")
        return AudioMetrics()


# ── Stage 3: transcript-based filler detection (sync) ────────────────────────

def count_fillers(transcript: str) -> int:
    """
    Count filler-word occurrences in the transcript.
    Pure sync function — no I/O, safe to call inline after STT completes.
    """
    if not transcript:
        return 0

    lower = transcript.lower()
    count = 0

    # Check multi-word fillers first (longer matches take priority)
    for filler in sorted(FILLER_WORDS, key=len, reverse=True):
        if " " in filler:
            count += lower.count(filler)
        else:
            # Word-boundary check for single-word fillers
            import re
            count += len(re.findall(rf"\b{re.escape(filler)}\b", lower))

    return count


def finalize_metrics(
    signal_metrics: AudioMetrics,
    transcript: str,
    duration_sec: float | None = None,
) -> AudioMetrics:
    """
    Merge signal-based metrics with transcript-based metrics.
    Returns a new AudioMetrics with accurate pace_wpm, filler_count,
    fluency_score, and clarity_score.
    """
    filler_count = count_fillers(transcript)

    # Accurate WPM from transcript word count + audio duration
    if duration_sec and duration_sec > 0 and transcript:
        word_count = len(transcript.split())
        pace_wpm = round(word_count / duration_sec * 60, 1)
    else:
        pace_wpm = signal_metrics.pace_wpm

    # Fluency: penalise pace outside 120–160 WPM ideal range
    ideal_min, ideal_max = 120.0, 160.0
    if ideal_min <= pace_wpm <= ideal_max:
        fluency_score = 100.0
    else:
        deviation = min(abs(pace_wpm - ideal_min), abs(pace_wpm - ideal_max))
        fluency_score = max(0.0, 100.0 - deviation * 0.5)

    # Use signal-derived fluency if transcript-based pace is unavailable
    if pace_wpm == 0:
        fluency_score = signal_metrics.fluency_score

    # Clarity: penalise filler words (each filler = −5 points)
    clarity_score = max(0.0, 100.0 - filler_count * 5.0)

    return AudioMetrics(
        pace_wpm=pace_wpm,
        filler_count=filler_count,
        fluency_score=round(fluency_score, 1),
        clarity_score=round(clarity_score, 1),
    )
