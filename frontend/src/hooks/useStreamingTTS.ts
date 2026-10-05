/**
 * useStreamingTTS — speaks sentences from conversational_response as they arrive
 * in the LLM token stream, without waiting for the full JSON to be parsed.
 *
 * Call onTokenChunk() with the accumulated token stream on every text_chunk event.
 * The hook parses the partial JSON, extracts complete sentences from
 * "conversational_response", and immediately queues them via speechSynthesis.speak().
 */
import { useCallback, useRef } from 'react';

const SENTENCE_END = /[.!?]+\s/g;

function extractPartialValue(stream: string, key: string): string | null {
  const marker = `"${key}": "`;
  const start = stream.indexOf(marker);
  if (start === -1) return null;
  const valueStart = start + marker.length;
  let i = valueStart;
  let result = '';
  while (i < stream.length) {
    const ch = stream[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === '"') break;
    result += ch;
    i++;
  }
  return result;
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('David'))
    ) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  );
}

export interface UseStreamingTTSReturn {
  onTokenChunk: (accumulatedStream: string) => void;
  reset: () => void;
  /** True if at least one sentence has been queued this turn */
  hasSpokenRef: React.MutableRefObject<boolean>;
}

export function useStreamingTTS(isMuted: boolean): UseStreamingTTSReturn {
  const spokenUpToRef = useRef(0);
  const hasSpokenRef = useRef(false);

  const reset = useCallback(() => {
    spokenUpToRef.current = 0;
    hasSpokenRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const onTokenChunk = useCallback(
    (accumulatedStream: string) => {
      if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      const value = extractPartialValue(accumulatedStream, 'conversational_response');
      if (!value || value.length <= spokenUpToRef.current) return;

      const unspoken = value.slice(spokenUpToRef.current);

      SENTENCE_END.lastIndex = 0;
      let lastMatchEnd = 0;
      let match: RegExpExecArray | null;
      const sentences: string[] = [];

      while ((match = SENTENCE_END.exec(unspoken)) !== null) {
        const sentence = unspoken.slice(lastMatchEnd, match.index + match[0].length).trim();
        if (sentence) sentences.push(sentence);
        lastMatchEnd = match.index + match[0].length;
      }

      if (sentences.length === 0) return;

      const voice = pickEnglishVoice();

      for (const sentence of sentences) {
        const utt = new SpeechSynthesisUtterance(sentence);
        utt.rate = 0.95;
        utt.pitch = 1.0;
        utt.volume = 1.0;
        if (voice) utt.voice = voice;
        window.speechSynthesis.speak(utt);
      }

      hasSpokenRef.current = true;
      spokenUpToRef.current += lastMatchEnd;
    },
    [isMuted],
  );

  return { onTokenChunk, reset, hasSpokenRef };
}
