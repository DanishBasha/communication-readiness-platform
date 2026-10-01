import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../../shared/db/pool';
import { AppError } from '../../shared/errors/AppError';
import { sendSuccess, sendError } from '../../shared/helpers/response';
import { authenticate, AuthRequest } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/authorize';

export const programsRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .slice(0, 50);
}

// ─── GET /api/programs ────────────────────────────────────────────────────────
// Returns all active programs with nested sub-programs.  No auth — used by
// registration forms and the mentor assessment-assignment dropdown.

programsRouter.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows: programs } = await db.query(
      `SELECT p.id, p.institution_id, p.name, p.code, p.created_at
       FROM org.programs p
       ORDER BY p.name`
    );

    const { rows: subs } = await db.query(
      `SELECT sp.id, sp.program_id, sp.name, sp.code, sp.is_active, sp.created_at
       FROM org.sub_programs sp
       ORDER BY sp.name`
    );

    const subsByProgram = new Map<string, typeof subs>();
    for (const s of subs) {
      if (!subsByProgram.has(s.program_id)) subsByProgram.set(s.program_id, []);
      subsByProgram.get(s.program_id)!.push(s);
    }

    const result = programs.map(p => ({
      ...p,
      sub_programs: subsByProgram.get(p.id) ?? [],
    }));

    sendSuccess(res, { programs: result });
  } catch (err) {
    sendError(res, err);
  }
});

// ─── GET /api/programs/:programId/sub-programs ────────────────────────────────

programsRouter.get('/:programId/sub-programs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { programId } = req.params;

    const { rows: prog } = await db.query(
      `SELECT id FROM org.programs WHERE id = $1`,
      [programId]
    );
    if (prog.length === 0) throw new AppError(404, 'Program not found', 'NOT_FOUND');

    const { rows } = await db.query(
      `SELECT id, program_id, name, code, is_active, created_at
       FROM org.sub_programs
       WHERE program_id = $1
       ORDER BY name`,
      [programId]
    );
    sendSuccess(res, { sub_programs: rows });
  } catch (err) {
    sendError(res, err);
  }
});

// ─── GET /api/programs/:programId/students ────────────────────────────────────
// Returns students enrolled in a program (optionally filtered by sub_program_id).
// Accessible to FACULTY_MENTOR, PROGRAM_ADMIN, PLACEMENT_COORDINATOR, TRAINER.

programsRouter.get(
  '/:programId/students',
  authenticate,
  requireRole('FACULTY_MENTOR', 'PROGRAM_ADMIN', 'PLACEMENT_COORDINATOR', 'TRAINER'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { programId } = req.params;
      const subProgramId = (req.query.sub_program_id as string) ?? null;

      const { rows: prog } = await db.query(
        `SELECT id FROM org.programs WHERE id = $1`,
        [programId]
      );
      if (prog.length === 0) throw new AppError(404, 'Program not found', 'NOT_FOUND');

      if (subProgramId) {
        const { rows: sub } = await db.query(
          `SELECT id FROM org.sub_programs WHERE id = $1 AND program_id = $2`,
          [subProgramId, programId]
        );
        if (sub.length === 0) {
          throw new AppError(404, 'Sub-program not found or does not belong to this program', 'NOT_FOUND');
        }
      }

      const { rows } = await db.query(
        `SELECT
           s.id              AS student_id,
           s.roll_number,
           u.id              AS user_id,
           u.name,
           u.email,
           u.status,
           p.name            AS program_name,
           sp.id             AS sub_program_id,
           sp.name           AS sub_program_name,
           sp.code           AS sub_program_code,
           spm.enrolled_at
         FROM org.student_programs spm
         JOIN org.students s   ON s.id  = spm.student_id
         JOIN identity.users u ON u.id  = s.user_id
         JOIN org.programs p   ON p.id  = spm.program_id
         LEFT JOIN org.sub_programs sp ON sp.id = spm.sub_program_id
         WHERE spm.program_id = $1
           AND ($2::uuid IS NULL OR spm.sub_program_id = $2::uuid)
         ORDER BY u.name`,
        [programId, subProgramId]
      );

      sendSuccess(res, { students: rows });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ─── GET /api/programs/:programId/sub-programs/:subId/students ───────────────

programsRouter.get(
  '/:programId/sub-programs/:subId/students',
  authenticate,
  requireRole('FACULTY_MENTOR', 'PROGRAM_ADMIN', 'PLACEMENT_COORDINATOR', 'TRAINER'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { programId, subId } = req.params;

      const { rows: sub } = await db.query(
        `SELECT id FROM org.sub_programs WHERE id = $1 AND program_id = $2`,
        [subId, programId]
      );
      if (sub.length === 0) {
        throw new AppError(404, 'Sub-program not found or does not belong to this program', 'NOT_FOUND');
      }

      const { rows } = await db.query(
        `SELECT
           s.id              AS student_id,
           s.roll_number,
           u.id              AS user_id,
           u.name,
           u.email,
           u.status,
           spm.enrolled_at
         FROM org.student_programs spm
         JOIN org.students s   ON s.id  = spm.student_id
         JOIN identity.users u ON u.id  = s.user_id
         WHERE spm.program_id = $1 AND spm.sub_program_id = $2
         ORDER BY u.name`,
        [programId, subId]
      );

      sendSuccess(res, { students: rows });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ─── POST /api/programs (PROGRAM_ADMIN) ───────────────────────────────────────

const createProgramSchema = z.object({
  institutionId: z.string().uuid(),
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
});

programsRouter.post(
  '/',
  authenticate,
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parsed = createProgramSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');
      const { institutionId, name, code } = parsed.data;

      const derivedCode = code ? code.toUpperCase().slice(0, 50) : toCode(name);

      const { rows } = await db.query(
        `INSERT INTO org.programs (institution_id, name, code)
         VALUES ($1, $2, $3)
         RETURNING id, institution_id, name, code, created_at`,
        [institutionId, name, derivedCode]
      );
      sendSuccess(res, { program: rows[0] }, 201);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        sendError(res, new AppError(409, 'A program with this code already exists for the institution', 'DUPLICATE'));
        return;
      }
      sendError(res, err);
    }
  }
);

// ─── PUT /api/programs/:id (PROGRAM_ADMIN) ────────────────────────────────────

const updateProgramSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(50).optional(),
});

programsRouter.put(
  '/:id',
  authenticate,
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const parsed = updateProgramSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');

      const sets: string[] = [];
      const vals: unknown[] = [id];
      let idx = 2;

      if (parsed.data.name !== undefined) { sets.push(`name = $${idx++}`); vals.push(parsed.data.name); }
      if (parsed.data.code !== undefined) { sets.push(`code = $${idx++}`); vals.push(parsed.data.code.toUpperCase().slice(0, 50)); }

      if (sets.length === 0) throw new AppError(422, 'No fields to update', 'VALIDATION_ERROR');

      const { rows } = await db.query(
        `UPDATE org.programs SET ${sets.join(', ')} WHERE id = $1
         RETURNING id, institution_id, name, code, created_at`,
        vals
      );
      if (rows.length === 0) throw new AppError(404, 'Program not found', 'NOT_FOUND');
      sendSuccess(res, { program: rows[0] });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ─── DELETE /api/programs/:id (PROGRAM_ADMIN) — soft-deactivate via sub-programs
// Programs themselves have no is_active column; deactivation sets all sub_programs
// to is_active=false and is documented as "archive" in API docs.
// A program with active student_programs associations cannot be deactivated.

programsRouter.delete(
  '/:id',
  authenticate,
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const { rows: prog } = await db.query(
        `SELECT id FROM org.programs WHERE id = $1`,
        [id]
      );
      if (prog.length === 0) throw new AppError(404, 'Program not found', 'NOT_FOUND');

      const { rows: enrolled } = await db.query(
        `SELECT 1 FROM org.student_programs WHERE program_id = $1 LIMIT 1`,
        [id]
      );
      if (enrolled.length > 0) {
        throw new AppError(409, 'Cannot deactivate: students are currently enrolled in this program', 'HAS_ENROLLMENTS');
      }

      await db.query(
        `UPDATE org.sub_programs SET is_active = false, updated_at = now() WHERE program_id = $1`,
        [id]
      );

      sendSuccess(res, { message: 'Program deactivated (all sub-programs archived)' });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ─── POST /api/programs/:programId/sub-programs (PROGRAM_ADMIN) ──────────────

const createSubProgramSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
});

programsRouter.post(
  '/:programId/sub-programs',
  authenticate,
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { programId } = req.params;

      const { rows: prog } = await db.query(
        `SELECT id FROM org.programs WHERE id = $1`,
        [programId]
      );
      if (prog.length === 0) throw new AppError(404, 'Program not found', 'NOT_FOUND');

      const parsed = createSubProgramSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');
      const { name, code } = parsed.data;

      const derivedCode = code ? code.toUpperCase().slice(0, 50) : toCode(name);

      const { rows } = await db.query(
        `INSERT INTO org.sub_programs (program_id, name, code)
         VALUES ($1, $2, $3)
         RETURNING id, program_id, name, code, is_active, created_at`,
        [programId, name, derivedCode]
      );
      sendSuccess(res, { sub_program: rows[0] }, 201);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        sendError(res, new AppError(409, 'A sub-program with this code already exists for the program', 'DUPLICATE'));
        return;
      }
      sendError(res, err);
    }
  }
);

// ─── PUT /api/programs/:programId/sub-programs/:subId (PROGRAM_ADMIN) ─────────

const updateSubProgramSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

programsRouter.put(
  '/:programId/sub-programs/:subId',
  authenticate,
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { programId, subId } = req.params;
      const parsed = updateSubProgramSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');

      const sets: string[] = ['updated_at = now()'];
      const vals: unknown[] = [subId, programId];
      let idx = 3;

      if (parsed.data.name     !== undefined) { sets.push(`name = $${idx++}`);      vals.push(parsed.data.name); }
      if (parsed.data.code     !== undefined) { sets.push(`code = $${idx++}`);      vals.push(parsed.data.code.toUpperCase().slice(0, 50)); }
      if (parsed.data.isActive !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(parsed.data.isActive); }

      const { rows } = await db.query(
        `UPDATE org.sub_programs SET ${sets.join(', ')}
         WHERE id = $1 AND program_id = $2
         RETURNING id, program_id, name, code, is_active, updated_at`,
        vals
      );
      if (rows.length === 0) throw new AppError(404, 'Sub-program not found', 'NOT_FOUND');
      sendSuccess(res, { sub_program: rows[0] });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ─── DELETE /api/programs/:programId/sub-programs/:subId (PROGRAM_ADMIN) ──────

programsRouter.delete(
  '/:programId/sub-programs/:subId',
  authenticate,
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { programId, subId } = req.params;

      const { rows } = await db.query(
        `UPDATE org.sub_programs SET is_active = false, updated_at = now()
         WHERE id = $1 AND program_id = $2
         RETURNING id`,
        [subId, programId]
      );
      if (rows.length === 0) throw new AppError(404, 'Sub-program not found', 'NOT_FOUND');
      sendSuccess(res, { message: 'Sub-program deactivated' });
    } catch (err) {
      sendError(res, err);
    }
  }
);
