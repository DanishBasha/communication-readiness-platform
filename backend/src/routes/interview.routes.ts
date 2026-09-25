/**
 * Interview Routes — /api/sessions (via router mount in routes/index.ts)
 *
 * Patterns enforced:
 *   W1  — BullMQ jobs NEVER in hot path; post-session cleanup via process.nextTick only
 *   W3  — Audio received as multipart/form-data via multer.single('audio'), never base64
 *   W5  — Node.js owns difficulty decisions; LLM recommendation is a hint only
 *   W8  — GET /bank-fallback: pure DB question, no LLM, synchronous
 *   W9  — FastAPI returns 0-10 scores; Node.js converts to 0-100 before storing
 *   W10 — DB read for token_version on every request (no Redis cache yet;
 *          add Redis caching here when Redis is fully integrated)
 *
 * M2 routes (sessions CRUD, conclude, proctor-event) are stubbed with comments
 * below — they will be implemented when M2 migrations (031+) run.
 */

import { Router, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import { z } from 'zod';
import { db } from '../shared/db/pool';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';
import { AuthRequest } from '../middleware/authenticate';
import { env } from '../config/env';
import { sessionContextService, TurnContext } from '../services/sessionContextService';

export const interviewRouter = Router();

// ── Multer: audio upload (W3 — never base64) ─────────────────────────────────
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max per audio segment
  fileFilter: (_req, file, cb) => {
    // Accept WAV and common audio formats from the VAD hook
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
  // LLM recommendation is a hint, not a command.
  // Score < 50: never advance regardless of LLM suggestion.
  // Score > 80: always advance if not already ADVANCED.
  if (currentScore < 50) return currentDifficulty;
  if (currentScore > 80 && currentDifficulty !== 'ADVANCED') return 'ADVANCED';
  return recommended;
}

// ── W9: Score normalisation (FastAPI returns 0-10; Node.js → 0-100) ──────────

interface RawEvaluation {
  technical_score: number;      // 0-10 from LLM
  filler_count: number;
  fluency_score: number;        // 0-100 already from audio analyzer
  clarity_score: number;        // 0-100 already from audio analyzer
  feedback: string;
  strengths: string;
  weaknesses: string;
  next_recommended_difficulty: Difficulty;
  transcript: string;
  stt_raw: string;
  pace_wpm: number;
}

interface NormalisedScores {
  technicalScore: number;       // 0-100
  communicationScore: number;   // 0-100
  overallScore: number;         // 0-100
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
// Accepts multipart/form-data: audio file + metadata JSON field.

interviewRouter.post(
  '/:id/turns',
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

      // Confirm session ID matches route param
      if (meta.sessionId !== req.params.id) {
        throw new AppError(400, 'sessionId mismatch', 'SESSION_ID_MISMATCH');
      }

      const audioBuffer: Buffer | undefined = req.file?.buffer;
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new AppError(400, 'Audio file is required', 'MISSING_AUDIO');
      }

      // ── Fetch Redis context for LLM (last 10 turns) ──────────────────────
      const previousTurns = await sessionContextService.getTurns(meta.sessionId, 10);

      // ── Call FastAPI evaluate-response (STT ∥ audio analysis → LLM) ──────
      // W1: this is the synchronous hot path — NO BullMQ here.
      const formData = new FormData();
      const audioBlob = new Blob([audioBuffer], { type: req.file!.mimetype || 'audio/wav' });
      formData.append('audio', audioBlob, req.file!.originalname || 'audio.wav');
      formData.append(
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

      const aiResponse = await axios.post<RawEvaluation>(
        `${env.AI_SERVICE_URL}/ai/evaluate-response`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const raw = aiResponse.data;

      // ── W9: Normalise scores ──────────────────────────────────────────────
      const { technicalScore, communicationScore, overallScore } = normaliseScores(raw);

      // ── W5: Node.js owns difficulty ───────────────────────────────────────
      const nextDifficulty = determineDifficulty(
        raw.next_recommended_difficulty,
        technicalScore,
        meta.difficulty,
      );

      // ── Persist turn to Redis context ─────────────────────────────────────
      const turnCtx: TurnContext = {
        turn: meta.turnNumber,
        question: meta.questionText,
        answer: raw.transcript || '',
        difficulty: meta.difficulty,
        ts: new Date().toISOString(),
      };
      await sessionContextService.appendTurn(meta.sessionId, turnCtx);

      // ── Flush transcript to PostgreSQL (safety write per turn) ────────────
      // Called on every turn so data is never lost if session ends abruptly.
      // flushToDb uses INSERT ... ON CONFLICT DO NOTHING — idempotent.
      // W1: This is a fire-and-forget async task, not a BullMQ job.
      process.nextTick(() => {
        sessionContextService.flushToDb(meta.sessionId, meta.studentId).catch((err) =>
          console.error('[interview.routes] flushToDb error:', err),
        );
      });

      sendSuccess(res, {
        transcript: raw.transcript,
        technicalScore,
        communicationScore,
        overallScore,
        feedback: raw.feedback,
        strengths: raw.strengths,
        weaknesses: raw.weaknesses,
        nextDifficulty,
        audioMetrics: {
          paceWpm: raw.pace_wpm,
          fillerCount: raw.filler_count,
          fluencyScore: raw.fluency_score,
          clarityScore: raw.clarity_score,
        },
        // W10: Note — Redis caching of token_version should be added here
        // when Redis is fully integrated to reduce DB reads per request.
      });
    } catch (err) {
      sendError(res, err);
    }
  },
);

// ── GET /api/sessions/bank-fallback — W8: synchronous bank question (no LLM) ─

interviewRouter.get(
  '/bank-fallback',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parsed = BankFallbackQuerySchema.safeParse(req.query);
      if (!parsed.success) throw new AppError(400, 'Invalid query parameters', 'VALIDATION_ERROR');
      const query = parsed.data;

      // Pure DB read — no LLM, no async AI calls.
      // Returns a random question from the bank for the requested difficulty/domain.
      // NOTE: session.question_bank is created in M2 migrations (031+).
      // Until then, return a static fallback so the frontend 3s timeout resolves.
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
