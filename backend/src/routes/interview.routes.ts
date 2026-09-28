/**
 * Interview Routes — /api/sessions (via router mount in routes/index.ts)
 *
 * Patterns enforced:
 *   W1  — BullMQ jobs NEVER in hot path; post-session cleanup via process.nextTick only
 *   W3  — Audio received as multipart/form-data via multer.single('audio'), never base64
 *   W5  — Node.js owns difficulty decisions; LLM recommendation is a hint only
 *   W8  — GET /bank-fallback: pure DB question, no LLM, synchronous
 *   W9  — FastAPI returns 0-10 scores; Node.js converts to 0-100 before storing
 *   W10 — DB read for token_version on every request
 */

import { Router, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { z } from 'zod';
import { db } from '../shared/db/pool';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { env } from '../config/env';
import { sessionContextService, TurnContext } from '../services/sessionContextService';

export const interviewRouter = Router();

// ── Multer: audio upload (W3 — never base64) ─────────────────────────────────
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max per audio segment
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.originalname.endsWith('.wav')) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Only audio files are accepted', 'INVALID_FILE_TYPE') as any);
    }
  },
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

const TurnMetadataSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  questionText: z.string().min(1),
  difficulty: z.enum(['EASY', 'MEDIUM', 'ADVANCED']).default('EASY'),
  turnNumber: z.coerce.number().int().min(1),
  domain: z.string().optional(),
});

const BankFallbackQuerySchema = z.object({
  difficulty: z.enum(['EASY', 'MEDIUM', 'ADVANCED']).default('EASY'),
  domain: z.string().optional(),
});

// ── W5: Server-owned difficulty gating ───────────────────────────────────────

type Difficulty = 'EASY' | 'MEDIUM' | 'ADVANCED';

function determineDifficulty(
  recommended: Difficulty,
  currentScore: number,
  currentDifficulty: Difficulty,
): Difficulty {
  if (currentScore < 50) return currentDifficulty;
  if (currentScore > 80 && currentDifficulty !== 'ADVANCED') return 'ADVANCED';
  return recommended;
}

// ── W9: Score normalisation (FastAPI returns 0-10; Node.js → 0-100) ──────────

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
}

interface NormalisedScores {
  technicalScore: number;
  communicationScore: number;
  overallScore: number;
}

function normaliseScores(raw: RawEvaluation): NormalisedScores {
  const technicalScore = Math.round(raw.technical_score * 10);
  const communicationScore = Math.round(
    (100 - raw.filler_count * 5) * 0.4 +
    raw.fluency_score * 0.3 +
    raw.clarity_score * 0.3,
  );
  const overallScore = Math.round(technicalScore * 0.7 + communicationScore * 0.3);
  return {
    technicalScore: Math.max(0, Math.min(100, technicalScore)),
    communicationScore: Math.max(0, Math.min(100, communicationScore)),
    overallScore: Math.max(0, Math.min(100, overallScore)),
  };
}

// ── POST /api/sessions/:id/turns — submit a turn (W1, W3, W5, W9) ────────────

interviewRouter.post(
  '/:id/turns',
  authenticate,
  requireRole('STUDENT'),
  audioUpload.single('audio'), // W3 — multer, not base64
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const metadataRaw = req.body?.metadata;
      if (!metadataRaw) {
        throw new AppError(400, 'metadata field is required', 'MISSING_METADATA');
      }

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

      // ── Fetch Redis context for LLM (last 10 turns) ──────────────────────
      const previousTurns = await sessionContextService.getTurns(meta.sessionId, 10).catch(() => []);

      // ── Forward audio to FastAPI /ai/evaluate-response ────────────────────
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
          domain: meta.domain,
          previous_turns: previousTurns.map((t) => ({
            question_text: t.question,
            student_answer: t.answer,
            difficulty: t.difficulty,
            technical_score: null,
          })),
        }),
      );

      let raw: RawEvaluation | null = null;
      try {
        const aiResp = await axios.post<RawEvaluation>(
          `${env.AI_SERVICE_URL}/ai/evaluate-response`,
          fd,
          { headers: fd.getHeaders(), timeout: 60_000 },
        );
        raw = aiResp.data;
      } catch {
        // AI service unavailable — proceed with empty scores
      }

      const { technicalScore, communicationScore, overallScore } = raw
        ? normaliseScores(raw)
        : { technicalScore: 0, communicationScore: 0, overallScore: 0 };

      const nextDifficulty = raw
        ? determineDifficulty(raw.next_recommended_difficulty, technicalScore, meta.difficulty)
        : meta.difficulty;

      // ── Persist turn to Redis context ─────────────────────────────────────
      const turnCtx: TurnContext = {
        turn: meta.turnNumber,
        question: meta.questionText,
        answer: raw?.transcript || '',
        difficulty: meta.difficulty,
        ts: new Date().toISOString(),
      };
      await sessionContextService.appendTurn(meta.sessionId, turnCtx).catch(() => {});

      // ── Flush transcript to PostgreSQL (safety write per turn, W1) ────────
      process.nextTick(() => {
        sessionContextService.flushToDb(meta.sessionId, meta.studentId).catch((err) =>
          console.error('[interview.routes] flushToDb error:', err),
        );
      });

      sendSuccess(res, {
        transcript: raw?.transcript ?? '',
        technicalScore,
        communicationScore,
        overallScore,
        feedback: raw?.feedback ?? '',
        strengths: raw?.strengths ?? '',
        weaknesses: raw?.weaknesses ?? '',
        nextDifficulty,
        audioMetrics: {
          paceWpm: raw?.pace_wpm ?? 0,
          fillerCount: raw?.filler_count ?? 0,
          fluencyScore: raw?.fluency_score ?? 0,
          clarityScore: raw?.clarity_score ?? 0,
        },
      });
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

      const { rows } = await db.query(
        `SELECT id, question_text, difficulty, category, domain
         FROM session.question_bank
         WHERE difficulty = $1
           AND ($2::text IS NULL OR domain = $2)
         ORDER BY random()
         LIMIT 1`,
        [query.difficulty, query.domain ?? null],
      ).catch(() => ({ rows: [] as any[] })); // table may not exist yet (pre-M2)

      if (rows.length > 0) {
        sendSuccess(res, rows[0]);
        return;
      }

      // Static fallback when question_bank table isn't available yet
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

// ── M2 stubs — implemented when Module 2 migrations (031+) run ───────────────

// POST /api/sessions              — start session (eligibility + credit check)
// GET  /api/sessions/:id          — get session state
// POST /api/sessions/:id/conclude — finalise session, flush Redis → PostgreSQL
// POST /api/sessions/:id/proctor-event — record tab-switch / fullscreen-exit
