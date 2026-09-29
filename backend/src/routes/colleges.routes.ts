import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../shared/db/pool';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';

export const collegesRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getCollegeWithSuperAdmin(institutionId: string) {
  const { rows } = await db.query<{
    id: string; name: string; code: string; campus_city: string | null;
    created_at: string; super_admin_email: string | null;
    super_admin_name: string | null; super_admin_status: string | null;
  }>(
    `SELECT i.id, i.name, i.code, i.campus_city, i.created_at,
       inv.email  AS super_admin_email,
       inv.name   AS super_admin_name,
       CASE inv.status
         WHEN 'PENDING'  THEN 'PENDING_INVITE'
         WHEN 'ACCEPTED' THEN 'ACTIVE'
       END        AS super_admin_status
     FROM org.institutions i
     LEFT JOIN LATERAL (
       SELECT email, name, status
       FROM identity.invites
       WHERE institution_id = i.id AND role = 'SUPER_ADMIN'
       ORDER BY created_at DESC LIMIT 1
     ) inv ON true
     WHERE i.id = $1`,
    [institutionId]
  );
  return rows[0] ?? null;
}

function formatCollege(row: {
  id: string; name: string; code: string; campus_city: string | null;
  created_at: string; super_admin_email: string | null;
  super_admin_name: string | null; super_admin_status: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    campusCity: row.campus_city ?? '',
    createdAt: row.created_at,
    superAdminEmail: row.super_admin_email ?? undefined,
    superAdminName: row.super_admin_name ?? undefined,
    superAdminStatus: row.super_admin_status ?? undefined,
  };
}

// ── GET /api/colleges ─────────────────────────────────────────────────────────

collegesRouter.get('/', authenticate, requireRole('PLATFORM_OWNER'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await db.query<{
      id: string; name: string; code: string; campus_city: string | null;
      created_at: string; super_admin_email: string | null;
      super_admin_name: string | null; super_admin_status: string | null;
    }>(
      `SELECT i.id, i.name, i.code, i.campus_city, i.created_at,
         inv.email  AS super_admin_email,
         inv.name   AS super_admin_name,
         CASE inv.status
           WHEN 'PENDING'  THEN 'PENDING_INVITE'
           WHEN 'ACCEPTED' THEN 'ACTIVE'
         END        AS super_admin_status
       FROM org.institutions i
       LEFT JOIN LATERAL (
         SELECT email, name, status
         FROM identity.invites
         WHERE institution_id = i.id AND role = 'SUPER_ADMIN'
         ORDER BY created_at DESC LIMIT 1
       ) inv ON true
       ORDER BY i.name`
    );
    sendSuccess(res, rows.map(formatCollege));
  } catch (err) {
    sendError(res, err);
  }
});

// ── POST /api/colleges ────────────────────────────────────────────────────────

const createCollegeSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  campusCity: z.string().max(255).optional(),
  type: z.string().max(50).optional(),
});

collegesRouter.post('/', authenticate, requireRole('PLATFORM_OWNER'), async (req: Request, res: Response): Promise<void> => {
  const parsed = createCollegeSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, new AppError(422, 'Validation failed', 'VALIDATION_ERROR'));
    return;
  }
  const { name, code, campusCity, type } = parsed.data;

  try {
    const { rows } = await db.query<{ id: string; name: string; code: string; campus_city: string | null; created_at: string }>(
      `INSERT INTO org.institutions (name, code, campus_city, type)
       VALUES ($1, $2, $3, $4) RETURNING id, name, code, campus_city, created_at`,
      [name, code.toUpperCase(), campusCity ?? null, type ?? null]
    );
    sendSuccess(res, formatCollege({ ...rows[0], super_admin_email: null, super_admin_name: null, super_admin_status: null }), 201);
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      sendError(res, new AppError(409, 'A college with that code already exists', 'DUPLICATE_CODE'));
      return;
    }
    sendError(res, err);
  }
});

// ── GET /api/colleges/:id ─────────────────────────────────────────────────────

collegesRouter.get('/:id', authenticate, requireRole('PLATFORM_OWNER', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const row = await getCollegeWithSuperAdmin(String(req.params.id));
    if (!row) throw new AppError(404, 'College not found', 'NOT_FOUND');
    sendSuccess(res, formatCollege(row));
  } catch (err) {
    sendError(res, err);
  }
});

// ── GET /api/colleges/:id/programs ────────────────────────────────────────────

collegesRouter.get('/:id/programs', authenticate, requireRole('PLATFORM_OWNER', 'SUPER_ADMIN', 'PROGRAM_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await db.query<{
      id: string; name: string; code: string; institution_id: string;
      is_active: boolean; created_at: string;
      sub_programs: { id: string; name: string; code: string }[];
    }>(
      `SELECT p.id, p.name, p.code, p.institution_id, p.is_active, p.created_at,
         COALESCE(
           json_agg(json_build_object('id', sp.id, 'name', sp.name, 'code', sp.code))
             FILTER (WHERE sp.id IS NOT NULL),
           '[]'
         ) AS sub_programs
       FROM org.programs p
       LEFT JOIN org.sub_programs sp ON sp.program_id = p.id AND sp.is_active = true
       WHERE p.institution_id = $1 AND p.is_active = true
       GROUP BY p.id
       ORDER BY p.name`,
      [req.params.id]
    );
    sendSuccess(res, rows.map(p => ({
      id: p.id,
      collegeId: p.institution_id,
      name: p.name,
      code: p.code,
      hasSubPrograms: (p.sub_programs as any[]).length > 0,
      subPrograms: (p.sub_programs as any[]).map((sp: any) => sp.name),
      adminPermissions: [],
      createdAt: p.created_at,
    })));
  } catch (err) {
    sendError(res, err);
  }
});

// ── POST /api/colleges/:id/invite-super-admin ─────────────────────────────────

const inviteAdminSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().max(255).default(''),
  email: z.string().email().transform(s => s.toLowerCase()),
});

collegesRouter.post('/:id/invite-super-admin', authenticate, requireRole('PLATFORM_OWNER'), async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = inviteAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, new AppError(422, 'Validation failed', 'VALIDATION_ERROR'));
    return;
  }
  const { firstName, lastName, email } = parsed.data;
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const token = crypto.randomUUID();

  try {
    const { rows: instRows } = await db.query<{ name: string }>(
      'SELECT name FROM org.institutions WHERE id = $1', [req.params.id]
    );
    if (instRows.length === 0) throw new AppError(404, 'College not found', 'NOT_FOUND');

    const { rows } = await db.query<{
      id: string; token: string; email: string; name: string; role: string;
      institution_id: string; status: string; created_at: string;
    }>(
      `INSERT INTO identity.invites (token, email, first_name, last_name, name, role, institution_id)
       VALUES ($1, $2, $3, $4, $5, 'SUPER_ADMIN', $6)
       RETURNING id, token, email, name, role, institution_id, status, created_at`,
      [token, email, firstName, lastName, name, req.params.id]
    );
    const invite = rows[0];

    sendSuccess(res, {
      invite: {
        token: invite.token,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        collegeId: invite.institution_id,
        collegeName: instRows[0].name,
        status: invite.status,
        createdAt: invite.created_at,
      },
      inviteUrl: `/?invite_token=${invite.token}`,
    }, 201);
  } catch (err) {
    sendError(res, err);
  }
});

// ── POST /api/colleges/:id/invite-program-admin ───────────────────────────────

const inviteProgramAdminSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().max(255).default(''),
  email: z.string().email().transform(s => s.toLowerCase()),
  programId: z.string().uuid().optional(),
  department: z.string().max(255).optional(),
  permissions: z.array(z.string()).default([]),
});

collegesRouter.post('/:id/invite-program-admin', authenticate, requireRole('PLATFORM_OWNER', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = inviteProgramAdminSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, new AppError(422, 'Validation failed', 'VALIDATION_ERROR'));
    return;
  }
  const { firstName, lastName, email, programId, department, permissions } = parsed.data;
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const token = crypto.randomUUID();

  try {
    const { rows: instRows } = await db.query<{ name: string }>(
      'SELECT name FROM org.institutions WHERE id = $1', [req.params.id]
    );
    if (instRows.length === 0) throw new AppError(404, 'College not found', 'NOT_FOUND');

    const { rows } = await db.query<{
      id: string; token: string; email: string; name: string; role: string;
      institution_id: string; program_id: string | null; department: string | null;
      status: string; created_at: string;
    }>(
      `INSERT INTO identity.invites
         (token, email, first_name, last_name, name, role, institution_id, program_id, department, permissions)
       VALUES ($1, $2, $3, $4, $5, 'PROGRAM_ADMIN', $6, $7, $8, $9)
       RETURNING id, token, email, name, role, institution_id, program_id, department, status, created_at`,
      [token, email, firstName, lastName, name, req.params.id, programId ?? null, department ?? null, JSON.stringify(permissions)]
    );
    const invite = rows[0];

    sendSuccess(res, {
      invite: {
        token: invite.token,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        collegeId: invite.institution_id,
        collegeName: instRows[0].name,
        programId: invite.program_id ?? undefined,
        department: invite.department ?? undefined,
        permissions,
        status: invite.status,
        createdAt: invite.created_at,
      },
      inviteUrl: `/?invite_token=${invite.token}`,
    }, 201);
  } catch (err) {
    sendError(res, err);
  }
});

// ── GET /api/colleges/overview-stats ─────────────────────────────────────────
// Must be registered BEFORE /:id to avoid matching "overview-stats" as an id.

collegesRouter.get('/stats/overview', authenticate, requireRole('PLATFORM_OWNER'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await db.query<{
      total_colleges: string;
      active_super_admins: string;
    }>(
      `SELECT
         COUNT(DISTINCT i.id)::text AS total_colleges,
         COUNT(DISTINCT inv.accepted_by_user_id)::text AS active_super_admins
       FROM org.institutions i
       LEFT JOIN identity.invites inv
         ON inv.institution_id = i.id AND inv.role = 'SUPER_ADMIN' AND inv.status = 'ACCEPTED'`
    );
    sendSuccess(res, {
      totalColleges: parseInt(rows[0].total_colleges, 10),
      activeSuperAdmins: parseInt(rows[0].active_super_admins, 10),
    });
  } catch (err) {
    sendError(res, err);
  }
});
