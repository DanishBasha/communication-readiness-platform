/**
 * Interview Routes — /api/sessions (via router mount in routes/index.ts)
 *
 * Patterns enforced:
 *   W1  — DB writes via process.nextTick (non-blocking hot path)
 *   W3  — Audio received as multipart/form-data via multer.single('audio'), never base64
 *   W5  — Node.js owns difficulty decisions; LLM recommendation is a hint only
 *   W8  — GET /bank-fallback: pure DB question, no LLM, synchronous
 *   W9  — FastAPI returns 0-10 scores; Node.js converts to 0-100 before storing
 *   W10 — DB read for token_version on every request (via authenticate middleware)
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import axios from 'axios';
import { IncomingMessage } from 'http';
import FormData from 'form-data';
import { z } from 'zod';
import { db } from '../shared/db/pool';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { env } from '../config/env';
import { sessionContextService, TurnContext, InterviewState } from '../services/sessionContextService';
import { wsManager } from '../services/wsManager';

export const interviewRouter = Router();

// ── Multer: audio upload (W3 — never base64) ─────────────────────────────────

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.originalname.endsWith('.wav')) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Only audio files are accepted', 'INVALID_FILE_TYPE') as any);
    }
  },
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const ResumeSchema = z.object({
  name: z.string().default(''),
  experience_level: z.string().default('fresher'),
  skills: z.object({
    languages: z.array(z.string()).default([]),
    frameworks: z.array(z.string()).default([]),
    databases: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
  }).default({}),
  projects: z.array(z.object({
    title: z.string(),
    tech_stack: z.array(z.string()).default([]),
    description: z.string().default(''),
  })).default([]),
  summary: z.string().default(''),
});

const StartSessionSchema = z.object({
  resume: ResumeSchema,
  topics: z.array(z.string()).optional(),
  maxTurns: z.number().int().min(1).max(30).default(10),
  domain: z.string().optional(),
});

const TurnMetadataSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  questionText: z.string().min(1),
  difficulty: z.enum(['EASY', 'MEDIUM', 'ADVANCED']).default('EASY'),
  turnNumber: z.coerce.number().int().min(1),
  domain: z.string().optional(),
});

const ConcludeSessionSchema = z.object({
  overallScore: z.number().min(0).max(100),
});

const BankFallbackQuerySchema = z.object({
  difficulty: z.enum(['EASY', 'MEDIUM', 'ADVANCED']).default('EASY'),
  domain: z.string().optional(),
});

// ── First question (no LLM call — sent by Node.js directly) ──────────────────

const FIRST_QUESTION =
  "Tell me about yourself. Walk me through your background, the key skills you've built, and what you've been working on most recently.";

const FIRST_QUESTION_RUBRIC: Record<string, unknown> = {
  key_concepts: ['background', 'relevant skills', 'recent work', 'career motivation'],
  strong_indicators: [
    'Structured answer with clear progression',
    'Names specific technologies or projects',
    'Connects past experience to the role',
  ],
  weak_indicators: [
    'Rambling with no structure',
    'Generic personal details unrelated to tech',
    'Cannot name specific skills or projects',
  ],
  scoring_bands: {
    high: '8-10: Structured, confident, cites specific technical examples',
    mid: '5-7: Decent overview but lacks specifics or structure',
    low: '0-4: Unstructured, vague, or off-topic',
  },
  follow_up_probes: [
    "You mentioned [X project] — what was the most challenging part of building it?",
    "Which of those skills do you feel most confident demonstrating today?",
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

type Difficulty = 'EASY' | 'MEDIUM' | 'ADVANCED';

function buildCurriculum(
  skills: { languages: string[]; frameworks: string[]; databases: string[] },
  customTopics?: string[],
): string[] {
  if (customTopics?.length) return customTopics;
  const all = [...skills.languages, ...skills.frameworks, ...skills.databases];
  return all.length > 0 ? all.slice(0, 4) : ['General Programming'];
}

// W5: Node.js owns difficulty gating — LLM recommendation is a hint only
function determineDifficulty(
  recommended: Difficulty,
  currentScore: number,
  currentDifficulty: Difficulty,
): Difficulty {
  if (currentScore < 50) return currentDifficulty;
  if (currentScore > 80 && currentDifficulty !== 'ADVANCED') return 'ADVANCED';
  return recommended;
}

// W9: FastAPI returns 0-10 scores → Node.js converts to 0-100
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
}

function normaliseScores(raw: RawEvaluation): {
  technicalScore: number;
  communicationScore: number;
  overallScore: number;
} {
  const technicalScore = Math.round(raw.technical_score * 10);
  const fillerPenalty = Math.max(0, 100 - raw.filler_count * 5); // guard against negative
  const communicationScore = Math.round(
    fillerPenalty * 0.4 + raw.fluency_score * 0.3 + raw.clarity_score * 0.3,
  );
  const overallScore = Math.round(technicalScore * 0.7 + communicationScore * 0.3);
  return {
    technicalScore: Math.max(0, Math.min(100, technicalScore)),
    communicationScore: Math.max(0, Math.min(100, communicationScore)),
    overallScore: Math.max(0, Math.min(100, overallScore)),
  };
}

// ── SSE stream consumer — parses FastAPI evaluate-response event stream ──────
// Forwards text_chunk events to WebSocket in real time; resolves with the
// 'result' event payload when the stream ends.

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
          const event = JSON.parse(line.slice(6)) as { type: string; text?: string; data?: RawEvaluation; message?: string };
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

// ── POST /api/sessions — start interview session ──────────────────────────────

interviewRouter.post(
  '/',
  authenticate,
  requireRole('STUDENT'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      let body: z.infer<typeof StartSessionSchema>;
      try {
        body = StartSessionSchema.parse(req.body);
      } catch {
        throw new AppError(
          422,
          'A valid resume is required to start an interview',
          'RESUME_REQUIRED',
        );
      }

      const studentId = req.user!.id;
      const sessionId = uuidv4();
      const curriculum = buildCurriculum(body.resume.skills, body.topics);

      const initialState: InterviewState = {
        session_id: sessionId,
        student_id: studentId,
        topic_curriculum: curriculum,
        completed_topics: [],
        active_topic: curriculum[0] ?? 'General',
        active_topic_question_count: 0,
        max_questions_per_topic: 3,
        do_not_ask_or_repeat: [FIRST_QUESTION],
        current_turn: 1,
        max_turns: body.maxTurns,
        current_difficulty: 'EASY',
        candidate_performance_trend: 'stable',
        consecutive_weak_answers: 0,
        current_question: FIRST_QUESTION,
        current_question_turn: 1,
        current_rubric: FIRST_QUESTION_RUBRIC,
      };

      // Seed Redis (parallel)
      await Promise.all([
        sessionContextService.setState(sessionId, initialState),
        sessionContextService.setResume(sessionId, body.resume as Record<string, unknown>),
      ]);

      // Create DB row
      await db.query(
        `INSERT INTO session.interview_sessions (id, student_id, status, interview_state)
         VALUES ($1, $2, 'active', $3)`,
        [sessionId, studentId, JSON.stringify(initialState)],
      );

      sendSuccess(res, {
        sessionId,
        firstQuestion: FIRST_QUESTION,
        curriculum,
        status: 'active',
      });
    } catch (err) {
      sendError(res, err);
    }
  },
);

// ── POST /api/sessions/:id/turns — submit a turn (W1, W3, W5, W9) ────────────

interviewRouter.post(
  '/:id/turns',
  authenticate,
  requireRole('STUDENT'),
  audioUpload.single('audio'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const metadataRaw = req.body?.metadata;
      if (!metadataRaw) throw new AppError(400, 'metadata field is required', 'MISSING_METADATA');

      let meta: z.infer<typeof TurnMetadataSchema>;
      try {
        meta = TurnMetadataSchema.parse(JSON.parse(metadataRaw));
      } catch {
        throw new AppError(400, 'Invalid metadata JSON', 'INVALID_METADATA');
      }

      if (meta.sessionId !== req.params.id) {
        throw new AppError(400, 'sessionId mismatch', 'SESSION_ID_MISMATCH');
      }

      if (!req.file || req.file.buffer.length === 0) {
        throw new AppError(400, 'Audio file is required', 'MISSING_AUDIO');
      }

      // ── Pull full session context from Redis (parallel) ───────────────────
      const [interviewState, shortTermSummaries, resume] = await Promise.all([
        sessionContextService.getState(meta.sessionId).catch(() => null),
        sessionContextService.getSummaries(meta.sessionId, 10).catch(() => [] as string[]),
        sessionContextService.getResume(meta.sessionId).catch(() => null),
      ]);

      const currentRubric = interviewState?.current_rubric ?? null;

      // ── Notify client: processing started ────────────────────────────────
      wsManager.emit(meta.sessionId, { type: 'status', stage: 'transcribing' });

      // ── Forward audio + full context to FastAPI ───────────────────────────
      const fd = new FormData();
      fd.append('audio', req.file.buffer, {
        filename: req.file.originalname || 'audio.wav',
        contentType: req.file.mimetype || 'audio/wav',
      });
      fd.append(
        'metadata',
        JSON.stringify({
          question_text: meta.questionText,
          difficulty: meta.difficulty,
          turn_number: meta.turnNumber,
          session_id: meta.sessionId,
          student_id: meta.studentId,
          domain: meta.domain,
          interview_state: interviewState ?? {},
          short_term_context: shortTermSummaries,
          current_rubric: currentRubric,
          resume: resume ?? {},
        }),
      );

      wsManager.emit(meta.sessionId, { type: 'status', stage: 'evaluating' });

      let raw: RawEvaluation | null = null;
      try {
        wsManager.emit(meta.sessionId, { type: 'status', stage: 'generating' });
        const aiResp = await axios.post(
          `${env.AI_SERVICE_URL}/ai/evaluate-response`,
          fd,
          { headers: fd.getHeaders(), timeout: 120_000, responseType: 'stream' },
        );
        raw = await consumeAIStream(aiResp.data as IncomingMessage, meta.sessionId);
      } catch {
        wsManager.emit(meta.sessionId, { type: 'error', message: 'AI service unavailable' });
        // proceed with empty scores
      }

      const { technicalScore, communicationScore, overallScore } = raw
        ? normaliseScores(raw)
        : { technicalScore: 0, communicationScore: 0, overallScore: 0 };

      const nextDifficulty = raw
        ? determineDifficulty(raw.next_recommended_difficulty, technicalScore, meta.difficulty)
        : meta.difficulty;

      // ── Update Redis state synchronously before responding ────────────────
      const updatedState = raw
        ? await sessionContextService
            .updateState(meta.sessionId, {
              ...(raw.update_state ?? {}),
              next_recommended_difficulty: raw.next_recommended_difficulty,
              increment_turn: true,
              increment_topic_question_count: true,
              current_question: raw.next_question_text ?? '',
              current_question_turn: meta.turnNumber + 1,
              current_rubric: raw.rubric_for_next_question ?? {},
            })
            .catch(() => null)
        : null;

      // ── Persist turn to Redis context (skip if STT returned nothing) ──────
      if (raw?.transcript) {
        const turnCtx: TurnContext = {
          turn: meta.turnNumber,
          question: meta.questionText,
          answer: raw.transcript,
          summary: raw.context_summary || '',
          difficulty: meta.difficulty,
          ts: new Date().toISOString(),
        };
        await sessionContextService.appendTurn(meta.sessionId, turnCtx).catch(() => {});
      }

      const turnPayload = {
        transcript: raw?.transcript ?? '',
        technicalScore,
        communicationScore,
        overallScore,
        feedback: raw?.feedback ?? '',
        strengths: raw?.strengths ?? '',
        weaknesses: raw?.weaknesses ?? '',
        nextDifficulty,
        nextQuestionText: raw?.next_question_text ?? '',
        contextSummary: raw?.context_summary ?? '',
        audioMetrics: {
          paceWpm: raw?.pace_wpm ?? 0,
          fillerCount: raw?.filler_count ?? 0,
          fluencyScore: raw?.fluency_score ?? 0,
          clarityScore: raw?.clarity_score ?? 0,
        },
      };

      // ── Send HTTP response immediately ────────────────────────────────────
      sendSuccess(res, { ...turnPayload, conversationalResponse: raw?.conversational_response ?? '' });

      // ── Emit turn_result + DB checkpoint (non-blocking) ──────────────────
      process.nextTick(async () => {
        try {
          wsManager.emit(meta.sessionId, { type: 'turn_result', data: turnPayload });

          // DB checkpoint on topic switch or every 5 turns
          const isTopicSwitch = Boolean(raw?.update_state?.mark_topic_completed);
          const isFiveTurnMark = meta.turnNumber % 5 === 0;
          if (updatedState && (isTopicSwitch || isFiveTurnMark)) {
            await sessionContextService.checkpointToDb(meta.sessionId);
          }

          await sessionContextService.flushToDb(meta.sessionId, meta.studentId);
        } catch (err) {
          console.error('[interview.routes] post-turn async error:', err);
        }
      });
    } catch (err) {
      sendError(res, err);
    }
  },
);

// ── POST /api/sessions/:id/conclude — finalise session ───────────────────────

interviewRouter.post(
  '/:id/conclude',
  authenticate,
  requireRole('STUDENT'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const sessionId = req.params.id as string;

      let body: z.infer<typeof ConcludeSessionSchema>;
      try {
        body = ConcludeSessionSchema.parse(req.body);
      } catch {
        throw new AppError(422, 'overallScore (0-100) is required', 'MISSING_SCORE');
      }

      const state = await sessionContextService.getState(sessionId);
      const studentId = (state?.student_id ?? req.user!.id) as string;

      // Flush final state to DB
      await db.query(
        `UPDATE session.interview_sessions
         SET status        = 'completed',
             overall_score = $1,
             ended_at      = now(),
             interview_state = $2,
             updated_at    = now()
         WHERE id = $3`,
        [body.overallScore, JSON.stringify(state ?? {}), sessionId],
      );

      // Final transcript flush (non-blocking)
      process.nextTick(() => {
        sessionContextService
          .flushToDb(sessionId, studentId)
          .catch((err) => console.error('[interview.routes] conclude flushToDb error:', err));
      });

      sendSuccess(res, { sessionId, status: 'completed', overallScore: body.overallScore });
    } catch (err) {
      sendError(res, err);
    }
  },
);

// ── GET /api/sessions/bank-fallback — W8: synchronous bank question (no LLM) ─

interviewRouter.get(
  '/bank-fallback',
  authenticate,
  requireRole('STUDENT'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parsed = BankFallbackQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR');
      const query = parsed.data;

      const { rows } = await db
        .query(
          `SELECT id, question_text, difficulty, category, domain
           FROM session.question_bank
           WHERE difficulty = $1
             AND ($2::text IS NULL OR domain = $2)
           ORDER BY random()
           LIMIT 1`,
          [query.difficulty, query.domain ?? null],
        )
        .catch(() => ({ rows: [] as any[] }));

      if (rows.length > 0) {
        sendSuccess(res, rows[0]);
        return;
      }

      const staticFallbacks: Record<string, string> = {
        EASY: 'Explain the difference between synchronous and asynchronous programming.',
        MEDIUM: 'How would you design a rate limiter for a high-traffic API?',
        ADVANCED: 'Describe a distributed consensus algorithm and its trade-offs.',
      };

      sendSuccess(res, {
        id: `fallback_${Date.now()}`,
        question_text: staticFallbacks[query.difficulty],
        difficulty: query.difficulty,
        category: 'General',
        domain: query.domain ?? null,
      });
    } catch (err) {
      sendError(res, err);
    }
  },
);
