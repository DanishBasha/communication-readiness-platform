import { useEffect, useRef, useState } from 'react';

export type WSMessage =
  | { type: 'status'; stage: string }
  | { type: 'text_chunk'; text: string }
  | { type: 'text_end' }
  | { type: 'transcript_interim'; text: string; isFinal: boolean }
  | { type: 'turn_result'; data: TurnResultData }
  | { type: 'clarification'; question: string; message: string }
  | { type: 'error'; message: string };

export interface TurnResultData {
  transcript: string;
  technicalScore: number;
  communicationScore: number;
  overallScore: number;
  feedback: string;
  strengths: string;
  weaknesses: string;
  nextDifficulty: string;
  nextQuestionText: string;
  contextSummary: string;
  audioMetrics: { paceWpm: number; fillerCount: number; fluencyScore: number; clarityScore: number };
  conversationalResponse: string;
}

interface UseInterviewWSOptions {
  sessionId: string | undefined;
  enabled: boolean;
  onMessage: (msg: WSMessage) => void;
}

export function useInterviewWS({ sessionId, enabled, onMessage }: UseInterviewWSOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // Use relative WS path so the Vite proxy forwards it to localhost:5000
    const wsBase = window.location.origin.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/interview?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[InterviewWS] connected');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('[InterviewWS] disconnected');
      setIsConnected(false);
      wsRef.current = null;
    };

    ws.onerror = (e) => console.error('[InterviewWS] error:', e);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as WSMessage;
        onMessageRef.current(msg);
      } catch {}
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId, enabled]);

  return { wsRef, isConnected };
}
