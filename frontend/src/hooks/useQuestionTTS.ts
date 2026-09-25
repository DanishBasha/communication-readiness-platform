/**
 * useQuestionTTS — Browser SpeechSynthesis hook for reading questions aloud.
 *
 * Wraps window.speechSynthesis in a stable React hook.
 * Prefers a network English voice (Google/Samantha/David) over local voices
 * for better naturalness.
 *
 * Usage:
 *   const { speak, cancel } = useQuestionTTS();
 *   speak(question.questionText, () => startRecording());
 */
import { useCallback, useEffect, useRef } from 'react';

export interface UseQuestionTTSReturn {
  /** Speak the given text. Cancels any ongoing speech first. */
  speak: (text: string, onEnd?: () => void) => void;
  /** Cancel any ongoing speech immediately. */
  cancel: () => void;
}

export function useQuestionTTS(): UseQuestionTTSReturn {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    // Cancel any ongoing speech before starting a new utterance
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Prefer a natural network English voice when available
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      return (
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('David'))
        ) ?? voices.find((v) => v.lang.startsWith('en')) ?? null
      );
    };

    const selectedVoice = pickVoice();
    if (selectedVoice) utterance.voice = selectedVoice;

    let ended = false;
    const handleEnd = () => {
      if (ended) return;
      ended = true;
      utteranceRef.current = null;
      onEnd?.();
    };

    utterance.onend = handleEnd;
    utterance.onerror = (e) => {
      console.warn('[TTS] SpeechSynthesis error:', e.error);
      handleEnd();
    };

    // Chromium onend reliability workaround: set a safety timeout
    const safetyMs = Math.max(5000, text.length * 90);
    const safetyTimer = setTimeout(() => {
      if (!ended) handleEnd();
    }, safetyMs);

    // Clear the safety timer if utterance ends naturally
    const origEnd = utterance.onend;
    utterance.onend = (e) => {
      clearTimeout(safetyTimer);
      if (origEnd) (origEnd as (e: SpeechSynthesisEvent) => void)(e);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cancel(), [cancel]);

  return { speak, cancel };
}
