/**
 * LLM evaluation triggered by Deepgram UtteranceEnd (WebSocket-driven path).
 * Mirrors POST /api/sessions/:id/turns but invoked from the WS audio pipeline.
 */

import axios from 'axios';
import { IncomingMessage } from 'http';
import { env } from '../config/env';
import { sessionContextService, TurnContext } from './sessionContextService';
import { wsManager } from './wsManager';
import type { AudioStartMeta } from './deepgramService';

// ── Types (mirrored from interview.routes.ts) ────────────────────────────────

type Difficulty = 'EASY' | 'MEDIUM' | 'ADVANCED';

interface RawEvaluation {
  technical_score: number;
  filler_count: number;
  fluency_score: number;
  clarity_score: number;
  feedback: string;
  strengths: string;
  weaknesses: string;
  next_recommended_difficulty: Difficulty;
  transcript: string;
  stt_raw: string;
  pace_wpm: number;
  conversational_response: string;
  next_question_text: string;
  rubric_for_next_question: Record<string, unknown>;
  update_state: { mark_topic_completed?: string | null; add_to_do_not_ask?: string | null };
  context_summary: string;
  is_clarification?: boolean;
}

// ── Helpers (same logic as interview.routes.ts) ───────────────────────────────

function normaliseScores(raw: RawEvaluation) {
  const technicalScore = Math.round(raw.technical_score * 10);
  const fillerPenalty = Math.max(0, 100 - raw.filler_count * 5);
  // clarity_score is 0-100; no × 10. fluency_score omitted (0 on text path; captured in fillerPenalty).
  const communicationScore = Math.round(fillerPenalty * 0.7 + raw.clarity_score * 0.3);
  const overallScore = Math.round(technicalScore * 0.7 + communicationScore * 0.3);
  return {
    technicalScore: Math.max(0, Math.min(100, technicalScore)),
    communicationScore: Math.max(0, Math.min(100, communicationScore)),
    overallScore: Math.max(0, Math.min(100, overallScore)),
  };
}

function determineDifficulty(
  recommended: Difficulty,
  currentScore: number,
  currentDifficulty: Difficulty,
): Difficulty {
  if (currentScore < 50) return currentDifficulty;
  if (currentScore > 80 && currentDifficulty !== 'ADVANCED') return 'ADVANCED';
  return recommended;
}

async function consumeAIStream(
  stream: IncomingMessage,
  sessionId: string,
): Promise<RawEvaluation | null> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let result: RawEvaluation | null = null;

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6)) as {
            type: string;
            text?: string;
            data?: RawEvaluation;
            message?: string;
          };
          if (event.type === 'text_chunk' && event.text) {
            wsManager.emit(sessionId, { type: 'text_chunk', text: event.text });
          } else if (event.type === 'text_end') {
            wsManager.emit(sessionId, { type: 'text_end' });
          } else if (event.type === 'result' && event.data) {
            result = event.data;
          } else if (event.type === 'error') {
            reject(new Error(event.message ?? 'AI service error'));
          }
        } catch {
          // malformed SSE line — skip
        }
      }
    });

    stream.on('end', () => resolve(result));
    stream.on('error', (err) => reject(err));
  });
}

// ── Clarification detection ───────────────────────────────────────────────────

// Short phrases asking the interviewer to repeat — skip LLM, re-send current question
const CLARIFICATION_RE =
  /^(can you |could you |please )?(repeat|say that again|come again|pardon|what(\?+)?|huh(\?+)?|sorry(\?+)?|i (didn't|did not|couldn't|could not) (hear|understand|catch) (that|you)(\s+please)?)(\?+)?$/i;

function isClarificationRequest(transcript: string): boolean {
  const t = transcript.trim();
  return t.split(/\s+/).length <= 10 && CLARIFICATION_RE.test(t);
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function triggerLLMEvaluation(
  sessionId: string,
  transcript: string,
  meta: AudioStartMeta,
): Promise<void> {
  // If the candidate just asked for a repeat, re-deliver the current question without
  // consuming a turn or calling the LLM.
  if (isClarificationRequest(transcript)) {
    wsManager.emit(sessionId, {
      type: 'clarification',
      question: meta.questionText,
      message: "I didn't catch that — here's the question again:",
    });
    return;
  }

  const [interviewState, shortTermSummaries, resume] = await Promise.all([
    sessionContextService.getState(sessionId).catch(() => null),
    sessionContextService.getSummaries(sessionId, 5).catch(() => [] as string[]),
    sessionContextService.getResume(sessionId).catch(() => null),
  ]);

  const currentRubric = interviewState?.current_rubric ?? null;

  wsManager.emit(sessionId, { type: 'status', stage: 'evaluating' });
  wsManager.emit(sessionId, { type: 'status', stage: 'generating' });

  let raw: RawEvaluation | null = null;
  try {
    const aiResp = await axios.post(
      `${env.AI_SERVICE_URL}/ai/evaluate-response-text`,
      {
        transcript,
        metadata: {
          question_text: meta.questionText,
          difficulty: meta.difficulty,
          turn_number: meta.turnNumber,
          session_id: sessionId,
          student_id: meta.studentId,
          domain: meta.domain,
          interview_state: interviewState ?? {},
          short_term_context: shortTermSummaries,
          current_rubric: currentRubric,
          resume: resume ?? {},
        },
      },
      { timeout: 120_000, responseType: 'stream' },
    );
    raw = await consumeAIStream(aiResp.data as IncomingMessage, sessionId);
  } catch (err) {
    console.error('[llmEvaluation] AI service error:', err);
    wsManager.emit(sessionId, { type: 'error', message: 'AI service unavailable' });
    return;
  }

  if (!raw) {
    wsManager.emit(sessionId, { type: 'error', message: 'Empty AI response' });
    return;
  }

  // LLM confirmed this was a clarification request — re-speak the question, skip all storage
  if (raw.is_clarification) {
    wsManager.emit(sessionId, {
      type: 'clarification',
      question: meta.questionText,
      message: "Sure! Here's the question again:",
    });
    return;
  }

  const { technicalScore, communicationScore, overallScore } = normaliseScores(raw);
  const nextDifficulty = determineDifficulty(
    raw.next_recommended_difficulty,
    technicalScore,
    meta.difficulty,
  );

  const updatedState = await sessionContextService
    .updateState(sessionId, {
      ...(raw.update_state ?? {}),
      next_recommended_difficulty: raw.next_recommended_difficulty,
      increment_turn: true,
      increment_topic_question_count: true,
      current_question: raw.next_question_text ?? '',
      current_question_turn: meta.turnNumber + 1,
      current_rubric: raw.rubric_for_next_question ?? {},
      overall_score: overallScore,
    })
    .catch(() => null);

  if (raw.transcript || transcript) {
    const turnCtx: TurnContext = {
      turn: meta.turnNumber,
      question: meta.questionText,
      answer: transcript,
      summary: raw.context_summary || '',
      difficulty: meta.difficulty,
      ts: new Date().toISOString(),
    };
    await sessionContextService.appendTurn(sessionId, turnCtx).catch(() => {});
  }

  const turnPayload = {
    transcript,
    technicalScore,
    communicationScore,
    overallScore,
    feedback: raw.feedback ?? '',
    strengths: raw.strengths ?? '',
    weaknesses: raw.weaknesses ?? '',
    nextDifficulty,
    nextQuestionText: raw.next_question_text ?? '',
    contextSummary: raw.context_summary ?? '',
    conversationalResponse: raw.conversational_response ?? '',
    audioMetrics: {
      paceWpm: 0,
      fillerCount: raw.filler_count ?? 0,
      fluencyScore: 0,
      clarityScore: raw.clarity_score ?? 0,
    },
  };

  wsManager.emit(sessionId, { type: 'turn_result', data: turnPayload });

  // DB checkpoint (non-blocking)
  process.nextTick(async () => {
    try {
      const isTopicSwitch = Boolean(raw?.update_state?.mark_topic_completed);
      const isFiveTurnMark = meta.turnNumber % 5 === 0;
      if (updatedState && (isTopicSwitch || isFiveTurnMark)) {
        await sessionContextService.checkpointToDb(sessionId);
      }
      await sessionContextService.flushToDb(sessionId, meta.studentId);
    } catch (err) {
      console.error('[llmEvaluation] post-turn async error:', err);
    }
  });
}
