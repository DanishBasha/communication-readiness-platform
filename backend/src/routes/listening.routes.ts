import path from 'path';
import { Router, Response } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '../shared/db/pool';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';
import { LocalStorageClient } from '../shared/storage/LocalStorageClient';
import { AuthRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { env } from '../config/env';

export const listeningRouter = Router();

const storage = new LocalStorageClient();
const upload  = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024 },
});

// ── GET /api/listening ─────────────────────────────────────────────────────────

listeningRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const difficulty = req.query.difficulty as string | undefined;
    const params: unknown[] = [];
    let sql = `SELECT id, title, content, difficulty, source_type, metadata,
                      is_active, created_at, updated_at
               FROM knowledge.listening_stories WHERE is_active = true`;
    if (difficulty) {
      params.push(difficulty.toUpperCase());
      sql += ` AND difficulty = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await db.query(sql, params);
    sendSuccess(res, { stories: rows });
  } catch (err) {
    sendError(res, err);
  }
});

// ── GET /api/listening/:id ─────────────────────────────────────────────────────

listeningRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, content, difficulty, source_type, metadata,
              is_active, created_at, updated_at
       FROM knowledge.listening_stories WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) throw new AppError(404, 'Listening story not found', 'NOT_FOUND');
    sendSuccess(res, { story: rows[0] });
  } catch (err) {
    sendError(res, err);
  }
});

// ── POST /api/listening ────────────────────────────────────────────────────────

const createSchema = z.object({
  title:       z.string().min(1).max(500),
  content:     z.string().min(1),
  difficulty:  z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  source_type: z.string().default('MANUAL'),
  metadata:    z.record(z.unknown()).optional(),
});

listeningRouter.post(
  '/',
  requireRole('PROGRAM_ADMIN', 'TRAINER'),
  upload.single('audio'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parsed = createSchema.safeParse(
        typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body
      );
      if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');
      const { title, content, difficulty, source_type, metadata } = parsed.data;

      // DBML listening_stories has no dedicated audio column — audio is stored via
      // LocalStorageClient and the resulting path is recorded in metadata.audio_url.
      // If no audio is uploaded, metadata.audio_url is simply absent.
      let resolvedMetadata: Record<string, unknown> = metadata ?? {};
      if (req.file) {
        try {
          const ext = path.extname(req.file.originalname) || '.bin';
          const destPath = `listening/${randomUUID()}${ext}`;
          const audioPath = await storage.upload(req.file.buffer, destPath, req.file.mimetype);
          resolvedMetadata = { ...resolvedMetadata, audio_url: audioPath };
        } catch (storageErr) {
          console.error('[listening] audio storage failed, story saved without audio:', storageErr);
        }
      }

      const { rows } = await db.query(
        `INSERT INTO knowledge.listening_stories
           (title, content, difficulty, source_type, metadata)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [title, content, difficulty, source_type, JSON.stringify(resolvedMetadata)]
      );
      sendSuccess(res, { story: rows[0] }, 201);
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── PUT /api/listening/:id ─────────────────────────────────────────────────────

const updateSchema = z.object({
  title:       z.string().min(1).max(500).optional(),
  content:     z.string().optional(),
  difficulty:  z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  source_type: z.string().optional(),
  metadata:    z.record(z.unknown()).optional(),
});

listeningRouter.put(
  '/:id',
  requireRole('PROGRAM_ADMIN', 'TRAINER'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');
      const { title, content, difficulty, source_type, metadata } = parsed.data;

      const { rows } = await db.query(
        `UPDATE knowledge.listening_stories
         SET title       = COALESCE($2, title),
             content     = COALESCE($3, content),
             difficulty  = COALESCE($4, difficulty),
             source_type = COALESCE($5, source_type),
             metadata    = COALESCE($6, metadata),
             updated_at  = now()
         WHERE id = $1 RETURNING *`,
        [req.params.id, title ?? null, content ?? null, difficulty ?? null,
         source_type ?? null, metadata ? JSON.stringify(metadata) : null]
      );
      if (rows.length === 0) throw new AppError(404, 'Listening story not found', 'NOT_FOUND');
      sendSuccess(res, { story: rows[0] });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── DELETE /api/listening/:id — soft delete ────────────────────────────────────

listeningRouter.delete(
  '/:id',
  requireRole('PROGRAM_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { rows } = await db.query(
        `UPDATE knowledge.listening_stories SET is_active = false, updated_at = now()
         WHERE id = $1 RETURNING id`,
        [req.params.id]
      );
      if (rows.length === 0) throw new AppError(404, 'Listening story not found', 'NOT_FOUND');
      sendSuccess(res, { message: 'Listening story deactivated' });
    } catch (err) {
      sendError(res, err);
    }
  }
);
