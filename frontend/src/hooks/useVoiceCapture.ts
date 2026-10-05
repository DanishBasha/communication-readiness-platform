/**
 * useVoiceCapture — Phase 1 Deepgram streaming path.
 *
 * Uses @ricky0123/vad-web (MessageChannel, no SharedArrayBuffer) to detect
 * speech start/end. On speech start, a MediaRecorder streams 250 ms audio
 * chunks as binary WebSocket frames to Node.js → Deepgram live transcription.
 * On speech end, signals `audio_end` so Deepgram can close the connection.
 *
 * No COEP/COOP headers required — vad-web communicates via MessageChannel.
 */
import { MicVAD } from '@ricky0123/vad-web';
import { useCallback, useEffect, useRef } from 'react';

export interface TurnMeta {
  questionText: string;
  difficulty: string;
  turnNumber: number;
  studentId: string;
  domain?: string;
}

export interface UseVoiceCaptureOptions {
  wsRef: React.MutableRefObject<WebSocket | null>;
  turnMeta: TurnMeta;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  minSpeechFrames?: number;
  redemptionFrames?: number;
}

export interface UseVoiceCaptureReturn {
  start: () => Promise<void>;
  stop: () => void;
}

export function useVoiceCapture({
  wsRef,
  turnMeta,
  onSpeechStart,
  onSpeechEnd,
  positiveSpeechThreshold = 0.6,
  negativeSpeechThreshold = 0.35,
  minSpeechFrames = 5,
  redemptionFrames = 5,
}: UseVoiceCaptureOptions): UseVoiceCaptureReturn {
  const vadRef = useRef<MicVAD | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const listeningRef = useRef(false);
  const turnMetaRef = useRef(turnMeta);
  turnMetaRef.current = turnMeta;

  const stop = useCallback(() => {
    listeningRef.current = false;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    vadRef.current?.destroy();
    vadRef.current = null;
    recorderRef.current = null;
    micStreamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (listeningRef.current) return;
    listeningRef.current = true;

    // Separate mic stream for MediaRecorder (VAD creates its own internally)
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      listeningRef.current = false;
      throw e;
    }
    micStreamRef.current = micStream;

    // Prefer WebM+Opus; fallback to whatever is supported
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    const recorder = new MediaRecorder(micStream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return;
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      e.data.arrayBuffer().then((buf) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(buf);
      }).catch(() => {});
    };

    recorder.onstop = () => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'audio_end' }));
      }
      onSpeechEnd?.();
    };

    vadRef.current = await MicVAD.new({
      positiveSpeechThreshold,
      negativeSpeechThreshold,
      minSpeechFrames,
      redemptionFrames,

      onSpeechStart: () => {
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'audio_start',
            ...turnMetaRef.current,
          }));
        }
        if (recorderRef.current?.state === 'inactive') {
          recorderRef.current.start(250);
        }
        onSpeechStart?.();
      },

      onSpeechEnd: () => {
        if (recorderRef.current?.state === 'recording') {
          recorderRef.current.stop();
          // audio_end is sent in recorder.onstop after the final chunk flushes
        }
      },
    });

    vadRef.current.start();
  }, [
    wsRef,
    onSpeechStart,
    onSpeechEnd,
    positiveSpeechThreshold,
    negativeSpeechThreshold,
    minSpeechFrames,
    redemptionFrames,
  ]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop };
}
