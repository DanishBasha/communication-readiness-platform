/**
 * useVoiceCapture — VAD-powered audio capture without SharedArrayBuffer.
 *
 * Uses @ricky0123/vad-web which communicates via MessageChannel instead of
 * SharedArrayBuffer, so NO Cross-Origin-Embedder-Policy (COEP) headers are needed.
 * Do NOT add COEP/COOP headers to vite.config.ts or any server config.
 *
 * When speech ends the VAD appends 200ms of silence before encoding so
 * Whisper does not cut off the final syllable.
 */
import { MicVAD, utils } from '@ricky0123/vad-web';
import { useCallback, useEffect, useRef } from 'react';

export interface UseVoiceCaptureOptions {
  /** Called with a WAV Blob (16 kHz mono) when a speech segment ends. */
  onSpeechEnd: (audioBlob: Blob) => void;
  /** Optional: called when VAD detects speech start. */
  onSpeechStart?: () => void;
  /**
   * Probability threshold above which a frame is considered speech.
   * Default: 0.9 (conservative — fewer false positives).
   */
  positiveSpeechThreshold?: number;
  /**
   * Probability threshold below which a frame is considered silence.
   * Default: 0.75.
   */
  negativeSpeechThreshold?: number;
  /**
   * Minimum consecutive speech frames before firing onSpeechStart.
   * Default: 5 (~160ms at 16 kHz / 512 frame size).
   */
  minSpeechFrames?: number;
}

export interface UseVoiceCaptureReturn {
  /** Start VAD and microphone capture. Idempotent if already started. */
  start: () => Promise<void>;
  /** Stop VAD and release microphone. */
  stop: () => void;
}

export function useVoiceCapture({
  onSpeechEnd,
  onSpeechStart,
  positiveSpeechThreshold = 0.9,
  negativeSpeechThreshold = 0.75,
  minSpeechFrames = 5,
}: UseVoiceCaptureOptions): UseVoiceCaptureReturn {
  const vadRef = useRef<MicVAD | null>(null);
  const listeningRef = useRef(false);

  const start = useCallback(async () => {
    if (listeningRef.current) return;
    listeningRef.current = true;

    vadRef.current = await MicVAD.new({
      positiveSpeechThreshold,
      negativeSpeechThreshold,
      minSpeechFrames,
      // redemptionFrames: number of consecutive non-speech frames before ending a segment
      redemptionFrames: 8,

      onSpeechStart: () => onSpeechStart?.(),

      onSpeechEnd: (audio: Float32Array) => {
        // Append 200ms silence tail so Whisper doesn't clip the final word
        const sampleRate = 16000;
        const silenceFrames = Math.floor(sampleRate * 0.2);
        const padded = new Float32Array(audio.length + silenceFrames);
        padded.set(audio);
        // silenceFrames at end are already 0.0 (Float32Array default)

        // Encode to WAV Blob (16 kHz mono) using the vad-web utility
        const wavBuffer = utils.encodeWAV(padded);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        onSpeechEnd(blob);
      },
    });

    vadRef.current.start();
  }, [onSpeechEnd, onSpeechStart, positiveSpeechThreshold, negativeSpeechThreshold, minSpeechFrames]);

  const stop = useCallback(() => {
    vadRef.current?.destroy();
    vadRef.current = null;
    listeningRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return { start, stop };
}
