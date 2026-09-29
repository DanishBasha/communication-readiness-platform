import { Router, Response } from 'express';
import { db } from '../shared/db/pool';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';

export const invitesRouter = Router();

// ── GET /api/invites/pending ───────────────────────────────────────────────────
// Returns pending invites scoped to the caller's institution (SUPER_ADMIN) or all (PLATFORM_OWNER).

invitesRouter.get('/pending', authenticate, requireRole('PLATFORM_OWNER', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let rows: any[];

    if (req.user!.role === 'PLATFORM_OWNER') {
      ({ rows } = await db.query(
        `SELECT inv.*, i.name AS college_name
         FROM identity.invites inv
         LEFT JOIN org.institutions i ON i.id = inv.institution_id
         WHERE inv.status = 'PENDING'
         ORDER BY inv.created_at DESC`
      ));
    } else {
      // SUPER_ADMIN: find their institution via their accepted invite
      const { rows: myInviteRows } = await db.query<{ institution_id: string }>(
        `SELECT institution_id FROM identity.invites
         WHERE accepted_by_user_id = $1 AND role = 'SUPER_ADMIN' LIMIT 1`,
        [req.user!.id]
      );
      const institutionId = myInviteRows[0]?.institution_id ?? null;
      ({ rows } = await db.query(
        `SELECT inv.*, i.name AS college_name
         FROM identity.invites inv
         LEFT JOIN org.institutions i ON i.id = inv.institution_id
         WHERE inv.status = 'PENDING' AND inv.institution_id = $1
         ORDER BY inv.created_at DESC`,
        [institutionId]
      ));
    }

    sendSuccess(res, rows.map(r => ({
      token: r.token,
      email: r.email,
      name: r.name,
      role: r.role,
      collegeId: r.institution_id,
      collegeName: r.college_name,
      programId: r.program_id ?? undefined,
      department: r.department ?? undefined,
      permissions: r.permissions ?? [],
      status: r.status,
      createdAt: r.created_at,
    })));
  } catch (err) {
    sendError(res, err);
  }
});

// ── GET /api/invites/:token ────────────────────────────────────────────────────
// Public — used by the Invite Activation tab in AuthModal to show invite details before password setup.

invitesRouter.get('/:token', async (req, res: Response): Promise<void> => {
  try {
    const { rows } = await db.query<{
      token: string; email: string; name: string; role: string;
      institution_id: string | null; program_id: string | null;
      department: string | null; permissions: string[];
      status: string; created_at: string; expires_at: string;
      college_name: string | null;
    }>(
      `SELECT inv.token, inv.email, inv.name, inv.role, inv.institution_id,
              inv.program_id, inv.department, inv.permissions, inv.status,
              inv.created_at, inv.expires_at, i.name AS college_name
       FROM identity.invites inv
       LEFT JOIN org.institutions i ON i.id = inv.institution_id
       WHERE inv.token = $1`,
      [req.params.token]
    );

    if (rows.length === 0) {
      sendError(res, new AppError(404, 'Invite not found', 'NOT_FOUND'));
      return;
    }

    const r = rows[0];

    if (r.status !== 'PENDING') {
      sendError(res, new AppError(409, 'Invite has already been used', 'INVITE_ALREADY_USED'));
      return;
    }
    if (new Date(r.expires_at) < new Date()) {
      sendError(res, new AppError(410, 'Invite link has expired', 'INVITE_EXPIRED'));
      return;
    }

    sendSuccess(res, {
      token: r.token,
      email: r.email,
      name: r.name,
      role: r.role,
      collegeId: r.institution_id ?? undefined,
      collegeName: r.college_name ?? undefined,
      programId: r.program_id ?? undefined,
      department: r.department ?? undefined,
      permissions: r.permissions ?? [],
      status: r.status,
      createdAt: r.created_at,
    });
  } catch (err) {
    sendError(res, err);
  }
});
