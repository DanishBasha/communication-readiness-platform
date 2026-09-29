import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../config/env';
import { db } from '../shared/db/pool';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';
import { eventBus } from '../shared/events/eventBus';
import { Events, UserRegisteredPayload } from '../shared/events/events';
import { UserRole } from '../shared/types/roles';
import { AuthUser } from '../shared/types/auth';

export const authRouter = Router();

function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      tokenVersion: user.tokenVersion,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
}

// ── POST /api/auth/register ────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().transform(s => s.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rollNumber: z.string().min(1),
  batchId: z.string().uuid(),
  subdivisionId: z.string().uuid().optional(),
});

authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, new AppError(422, 'Validation failed', 'VALIDATION_ERROR'));
    return;
  }
  const { name, email, password, rollNumber, batchId, subdivisionId } = parsed.data;

  const client = await db.connect();
  try {
    const { rows: batchRows } = await client.query('SELECT id FROM org.batches WHERE id = $1', [batchId]);
    if (batchRows.length === 0) {
      throw new AppError(404, 'Batch not found', 'NOT_FOUND');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');
    try {
      const { rows: userRows } = await client.query<{ id: string }>(
        `INSERT INTO identity.users (name, email, password_hash, role, token_version, status)
         VALUES ($1, $2, $3, 'STUDENT', 0, 'ACTIVE') RETURNING id`,
        [name, email, passwordHash]
      );
      const userId = userRows[0].id;

      const { rows: studentRows } = await client.query<{ id: string }>(
        `INSERT INTO org.students (user_id, roll_number, batch_id, subdivision_id, coding_handles)
         VALUES ($1, $2, $3, $4, '{}') RETURNING id`,
        [userId, rollNumber, batchId, subdivisionId ?? null]
      );
      const studentId = studentRows[0].id;

      await client.query('COMMIT');

      const authUser: AuthUser = { id: userId, email, role: 'STUDENT', name, tokenVersion: 0 };
      const token = signToken(authUser);

      const payload: UserRegisteredPayload = { userId, studentId, email, name };
      eventBus.emit(Events.USER_REGISTERED, payload);

      sendSuccess(res, { token, user: { id: userId, name, email, role: 'STUDENT' }, studentId }, 201);
    } catch (innerErr) {
      await client.query('ROLLBACK');
      throw innerErr;
    }
  } catch (err) {
    if (err instanceof AppError) { sendError(res, err); return; }
    if ((err as { code?: string }).code === '23505') {
      sendError(res, new AppError(409, 'Email or roll number already registered', 'DUPLICATE_EMAIL'));
      return;
    }
    sendError(res, err);
  } finally {
    client.release();
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email().transform(s => s.toLowerCase()),
  password: z.string().min(1),
});

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, new AppError(422, 'Validation failed', 'VALIDATION_ERROR'));
    return;
  }
  const { email, password } = parsed.data;

  try {
    const { rows } = await db.query<{
      id: string; name: string; email: string; role: UserRole;
      password_hash: string; token_version: number; status: string;
    }>(
      `SELECT id, name, email, role, password_hash, token_version, status
       FROM identity.users WHERE email = $1`,
      [email]
    );

    // Always run bcrypt regardless of whether the email exists — prevents timing-based
    // user enumeration (a found email would otherwise be ~100ms slower than a missing one).
    const DUMMY_HASH = '$2a$10$invalidhashpadding..................................';
    const hashToCheck = rows.length > 0 ? rows[0].password_hash : DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, hashToCheck);
    if (rows.length === 0 || !passwordMatch) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const user = rows[0];
    if (user.status === 'SUSPENDED') {
      throw new AppError(403, 'Account suspended', 'ACCOUNT_SUSPENDED');
    }

    let studentId: string | null = null;
    if (user.role === 'STUDENT') {
      const { rows: sRows } = await db.query<{ id: string }>(
        'SELECT id FROM org.students WHERE user_id = $1', [user.id]
      );
      studentId = sRows[0]?.id ?? null;
    }

    // For SUPER_ADMIN / PROGRAM_ADMIN, look up their institution via accepted invite
    let collegeId: string | null = null;
    let collegeName: string | null = null;
    let programId: string | null = null;
    if (user.role === 'SUPER_ADMIN' || user.role === 'PROGRAM_ADMIN') {
      const { rows: invRows } = await db.query<{
        institution_id: string | null; program_id: string | null; inst_name: string | null;
      }>(
        `SELECT inv.institution_id, inv.program_id, i.name AS inst_name
         FROM identity.invites inv
         LEFT JOIN org.institutions i ON i.id = inv.institution_id
         WHERE inv.accepted_by_user_id = $1 LIMIT 1`,
        [user.id]
      );
      if (invRows.length > 0) {
        collegeId = invRows[0].institution_id;
        collegeName = invRows[0].inst_name;
        programId = invRows[0].program_id;
      }
    }

    const authUser: AuthUser = {
      id: user.id, email: user.email, role: user.role,
      name: user.name, tokenVersion: user.token_version,
    };
    const token = signToken(authUser);

    sendSuccess(res, {
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        ...(collegeId && { collegeId }),
        ...(collegeName && { collegeName }),
        ...(programId && { programId }),
      },
      studentId,
    });
  } catch (err) {
    sendError(res, err);
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────────

authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db.query(
      'UPDATE identity.users SET token_version = token_version + 1 WHERE id = $1',
      [req.user!.id]
    );
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    sendError(res, err);
  }
});

// ── POST /api/auth/invite/activate ────────────────────────────────────────────

const inviteActivateSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

authRouter.post('/invite/activate', async (req: Request, res: Response): Promise<void> => {
  const parsed = inviteActivateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, new AppError(422, 'Validation failed', 'VALIDATION_ERROR'));
    return;
  }
  const { token, password } = parsed.data;

  const client = await db.connect();
  try {
    const { rows: inviteRows } = await client.query<{
      id: string; email: string; name: string; role: UserRole;
      status: string; expires_at: string; institution_id: string | null;
      program_id: string | null; department: string | null; permissions: string[];
      inst_name: string | null;
    }>(
      `SELECT inv.id, inv.email, inv.name, inv.role, inv.status, inv.expires_at,
              inv.institution_id, inv.program_id, inv.department, inv.permissions,
              i.name AS inst_name
       FROM identity.invites inv
       LEFT JOIN org.institutions i ON i.id = inv.institution_id
       WHERE inv.token = $1`,
      [token]
    );

    if (inviteRows.length === 0) {
      throw new AppError(404, 'Invite not found or already used', 'NOT_FOUND');
    }
    const invite = inviteRows[0];

    if (invite.status !== 'PENDING') {
      throw new AppError(409, 'Invite has already been accepted', 'INVITE_ALREADY_USED');
    }
    if (new Date(invite.expires_at) < new Date()) {
      throw new AppError(410, 'Invite link has expired', 'INVITE_EXPIRED');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');
    try {
      const { rows: userRows } = await client.query<{ id: string }>(
        `INSERT INTO identity.users (name, email, password_hash, role, token_version, status)
         VALUES ($1, $2, $3, $4, 0, 'ACTIVE') RETURNING id`,
        [invite.name, invite.email, passwordHash, invite.role]
      );
      const userId = userRows[0].id;

      await client.query(
        `UPDATE identity.invites
         SET status = 'ACCEPTED', accepted_by_user_id = $1, accepted_at = now()
         WHERE id = $2`,
        [userId, invite.id]
      );

      await client.query('COMMIT');

      const authUser: AuthUser = {
        id: userId, email: invite.email, role: invite.role,
        name: invite.name, tokenVersion: 0,
      };
      const jwtToken = signToken(authUser);

      sendSuccess(res, {
        token: jwtToken,
        user: {
          id: userId, name: invite.name, email: invite.email, role: invite.role,
          ...(invite.institution_id && { collegeId: invite.institution_id }),
          ...(invite.inst_name && { collegeName: invite.inst_name }),
          ...(invite.program_id && { programId: invite.program_id }),
          ...(invite.department && { department: invite.department }),
          permissions: invite.permissions ?? [],
        },
      }, 201);
    } catch (innerErr) {
      await client.query('ROLLBACK');
      throw innerErr;
    }
  } catch (err) {
    if (err instanceof AppError) { sendError(res, err); return; }
    if ((err as { code?: string }).code === '23505') {
      sendError(res, new AppError(409, 'An account with this email already exists', 'DUPLICATE_EMAIL'));
      return;
    }
    sendError(res, err);
  } finally {
    client.release();
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────

authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    let studentId: string | null = null;
    if (user.role === 'STUDENT') {
      const { rows } = await db.query<{ id: string }>(
        'SELECT id FROM org.students WHERE user_id = $1', [user.id]
      );
      studentId = rows[0]?.id ?? null;
    }

    let collegeId: string | null = null;
    let collegeName: string | null = null;
    let programId: string | null = null;
    if (user.role === 'SUPER_ADMIN' || user.role === 'PROGRAM_ADMIN') {
      const { rows: invRows } = await db.query<{
        institution_id: string | null; program_id: string | null; inst_name: string | null;
      }>(
        `SELECT inv.institution_id, inv.program_id, i.name AS inst_name
         FROM identity.invites inv
         LEFT JOIN org.institutions i ON i.id = inv.institution_id
         WHERE inv.accepted_by_user_id = $1 LIMIT 1`,
        [user.id]
      );
      if (invRows.length > 0) {
        collegeId = invRows[0].institution_id;
        collegeName = invRows[0].inst_name;
        programId = invRows[0].program_id;
      }
    }

    sendSuccess(res, {
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        ...(collegeId && { collegeId }),
        ...(collegeName && { collegeName }),
        ...(programId && { programId }),
      },
      studentId,
    });
  } catch (err) {
    sendError(res, err);
  }
});
