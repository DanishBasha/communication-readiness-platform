import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../shared/db/pool';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';
import { AuthRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';

export const skillsRouter = Router();

// ── GET /api/skills ────────────────────────────────────────────────────────────

skillsRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string | undefined;
    const params: unknown[] = [];
    let sql = `SELECT id, name, category, description, is_active, created_at, updated_at
               FROM performance.skills WHERE is_active = true`;
    if (category) {
      params.push(category.toUpperCase());
      sql += ` AND category = $${params.length}`;
    }
    sql += ' ORDER BY category, name';
    const { rows } = await db.query(sql, params);
    sendSuccess(res, { skills: rows });
  } catch (err) {
    sendError(res, err);
  }
});

// ── GET /api/skills/:id ────────────────────────────────────────────────────────

skillsRouter.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, category, description, is_active, created_at, updated_at
       FROM performance.skills WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) throw new AppError(404, 'Skill not found', 'NOT_FOUND');
    sendSuccess(res, { skill: rows[0] });
  } catch (err) {
    sendError(res, err);
  }
});

// ── POST /api/skills ───────────────────────────────────────────────────────────

const createSchema = z.object({
  name:        z.string().min(1).max(255),
  category:    z.string().min(1).max(50),
  description: z.string().optional(),
});

skillsRouter.post(
  '/',
  requireRole('PROGRAM_ADMIN', 'TRAINER'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');
      const { name, category, description } = parsed.data;
      const { rows } = await db.query(
        `INSERT INTO performance.skills (name, category, description)
         VALUES ($1, $2, $3) RETURNING *`,
        [name, category.toUpperCase(), description ?? null]
      );
      sendSuccess(res, { skill: rows[0] }, 201);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        sendError(res, new AppError(409, 'Skill with this name and category already exists', 'DUPLICATE'));
        return;
      }
      sendError(res, err);
    }
  }
);

// ── PUT /api/skills/:id ────────────────────────────────────────────────────────

const updateSchema = z.object({
  name:        z.string().min(1).max(255).optional(),
  category:    z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  is_active:   z.boolean().optional(),
});

skillsRouter.put(
  '/:id',
  requireRole('PROGRAM_ADMIN', 'TRAINER'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');
      const { name, category, description, is_active } = parsed.data;

      const { rows: existing } = await db.query(
        'SELECT id FROM performance.skills WHERE id = $1', [req.params.id]
      );
      if (existing.length === 0) throw new AppError(404, 'Skill not found', 'NOT_FOUND');

      const { rows } = await db.query(
        `UPDATE performance.skills
         SET name        = COALESCE($2, name),
             category    = COALESCE($3, category),
             description = COALESCE($4, description),
             is_active   = COALESCE($5, is_active),
             updated_at  = now()
         WHERE id = $1 RETURNING *`,
        [req.params.id, name ?? null, category?.toUpperCase() ?? null, description ?? null, is_active ?? null]
      );
      sendSuccess(res, { skill: rows[0] });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── DELETE /api/skills/:id — soft delete ──────────────────────────────────────

skillsRouter.delete(
  '/:id',
  requireRole('PROGRAM_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { rows } = await db.query(
        `UPDATE performance.skills SET is_active = false, updated_at = now()
         WHERE id = $1 RETURNING id`,
        [req.params.id]
      );
      if (rows.length === 0) throw new AppError(404, 'Skill not found', 'NOT_FOUND');
      sendSuccess(res, { message: 'Skill deactivated' });
    } catch (err) {
      sendError(res, err);
    }
  }
);
