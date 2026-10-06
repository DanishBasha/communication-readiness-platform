import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../shared/db/pool';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';
import { AuthRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { sendStaffWelcomeEmail } from '../services/emailService';

export const adminRouter = Router();

// ── GET /api/admin/users (PROGRAM_ADMIN) ──────────────────────────────────────

adminRouter.get(
  '/users',
  requireRole('PROGRAM_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const roleFilter = (req.query.role as string) ?? null;
      const statusFilter = (req.query.status as string) ?? null;
      const searchFilter = (req.query.search as string) ?? null;

      const { rows } = await db.query(
        `SELECT id, name, email, role, status, created_at
         FROM identity.users
         WHERE ($1::text IS NULL OR role::text = $1)
           AND ($2::text IS NULL OR status::text = $2)
           AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%' OR email ILIKE '%' || $3 || '%')
         ORDER BY created_at DESC
         LIMIT 100`,
        [roleFilter, statusFilter, searchFilter]
      );
      sendSuccess(res, { users: rows });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── PATCH /api/admin/users/:userId/role (PROGRAM_ADMIN) ───────────────────────

const roleSchema = z.object({
  role: z.enum(['STUDENT', 'FACULTY_MENTOR', 'PROGRAM_ADMIN', 'TRAINER', 'PLACEMENT_COORDINATOR']),
});

adminRouter.patch(
  '/users/:userId/role',
  requireRole('PROGRAM_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const parsed = roleSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'Invalid role value', 'VALIDATION_ERROR');

      // Prevent any PROGRAM_ADMIN from granting PROGRAM_ADMIN to another user.
      // Full cross-institution scoping is a post-MVP item; this guard prevents the most
      // dangerous privilege-escalation path (creating peer admins without oversight).
      if (parsed.data.role === 'PROGRAM_ADMIN') {
        throw new AppError(403, 'Cannot grant PROGRAM_ADMIN role via this endpoint', 'FORBIDDEN');
      }

      const { rows } = await db.query(
        `UPDATE identity.users
         SET role = $1, token_version = token_version + 1, updated_at = now()
         WHERE id = $2
         RETURNING id, name, email, role`,
        [parsed.data.role, userId]
      );
      if (rows.length === 0) throw new AppError(404, 'User not found', 'NOT_FOUND');

      sendSuccess(res, { user: rows[0] });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── PATCH /api/admin/users/:userId/status (PROGRAM_ADMIN) ─────────────────────

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

adminRouter.patch(
  '/users/:userId/status',
  requireRole('PROGRAM_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'Invalid status value', 'VALIDATION_ERROR');

      const { rows } = await db.query(
        `UPDATE identity.users
         SET status = $1, updated_at = now()
         WHERE id = $2
         RETURNING id, name, email, status`,
        [parsed.data.status, userId]
      );
      if (rows.length === 0) throw new AppError(404, 'User not found', 'NOT_FOUND');

      sendSuccess(res, { user: rows[0] });
    } catch (err) {
      sendError(res, err);
    }
  }
);

// ── POST /api/admin/users — create staff account + send welcome email ─────────

const createStaffSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().transform(s => s.toLowerCase()),
  role: z.enum(['FACULTY_MENTOR', 'TRAINER', 'PLACEMENT_COORDINATOR', 'PROGRAM_ADMIN']),
});

adminRouter.post(
  '/users',
  requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parsed = createStaffSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');

      const { name, email, role } = parsed.data;

      const { rows: existing } = await db.query(
        'SELECT id FROM identity.users WHERE email = $1',
        [email]
      );
      if (existing.length > 0) throw new AppError(409, 'Email already registered', 'CONFLICT');

      // Generate a secure 12-character random password (alphanumeric only)
      const password = crypto.randomBytes(16).toString('hex').slice(0, 12);
      const passwordHash = await bcrypt.hash(password, 10);

      const { rows } = await db.query(
        `INSERT INTO identity.users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, created_at`,
        [name, email, passwordHash, role]
      );

      const user = rows[0];

      // Send welcome email non-blocking — failure must not break the 201 response
      const createdByName = (req as AuthRequest).user?.name ?? 'Platform Admin';
      sendStaffWelcomeEmail({
        to: email,
        name,
        role,
        password,
        createdBy: createdByName,
      }).catch((err: unknown) => {
        console.error('[adminRouter] Welcome email failed:', err);
      });

      sendSuccess(res, { user }, 201);
    } catch (err) {
      sendError(res, err);
    }
  }
);
