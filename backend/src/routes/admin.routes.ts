import { Router, Request, Response } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '../shared/db/pool';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';
import { AuthRequest } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { eventBus } from '../shared/events/eventBus';
import { Events, UserRegisteredPayload } from '../shared/events/events';
import { env } from '../config/env';

export const adminRouter = Router();

// ── GET /api/admin/users (PROGRAM_ADMIN) ──────────────────────────────────────

adminRouter.get(
  '/users',
  requireRole('PROGRAM_ADMIN'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const roleFilter   = (req.query.role   as string) ?? null;
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
      if (!parsed.success) throw new AppError(422, 'VALIDATION_ERROR', 'VALIDATION_ERROR');

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

// ── POST /api/admin/students/import (PROGRAM_ADMIN) ───────────────────────────
//
// Accepts a CSV file upload (multipart/form-data, field name: "file").
//
// CSV format (UTF-8, comma-separated, header row required):
//
//   Required columns:
//     name          – student full name
//     email         – unique identity key (lowercased internally)
//     password      – temporary password (min 8 chars); hashed with bcrypt,
//                     NEVER logged, NEVER returned in responses
//     program       – training program name (e.g. "PEP", "HOPE")
//
//   Optional columns:
//     sub_program   – specialization name (e.g. "Full Stack", "Cyber")
//                     aliases: subprogram, sub-program, specialization
//     roll_number   – student roll number; auto-generated as IMP-XXXXXX if omitted
//
//   Optional form field:
//     institution_id – UUID; first institution in DB is used when omitted
//
// Duplicate handling:
//   email already exists → resolve existing user/student, UPSERT program association
//   same email twice in file → first row processed, rest skipped
//   student already in same program+sub_program → reported as 'already_enrolled'
//
// Transaction strategy: row-level (each row in its own transaction).
// Programs/sub-programs are created via ON CONFLICT DO UPDATE (idempotent).

const _csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'text/csv' ||
      file.mimetype === 'text/plain' ||
      file.originalname.toLowerCase().endsWith('.csv');
    cb(null, ok);
  },
});

function _parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function _parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headers: string[] = [];
  const results: Record<string, string>[] = [];
  let headerFound = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const fields = _parseRow(line);
    if (!headerFound) {
      for (const h of fields) {
        headers.push(h.trim().toLowerCase().replace(/[\s-]+/g, '_'));
      }
      headerFound = true;
      continue;
    }
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (fields[j] ?? '').trim();
    }
    results.push(row);
  }
  return results;
}

function _toCode(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 50);
}

function _genRoll(): string {
  return `IMP-${randomBytes(3).toString('hex').toUpperCase()}`;
}

adminRouter.post(
  '/students/import',
  requireRole('PROGRAM_ADMIN'),
  _csvUpload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError(422, 'CSV file is required (multipart field name: file)', 'FILE_REQUIRED');
      }

      const text = req.file.buffer.toString('utf8');
      const rows = _parseCsv(text);
      if (rows.length === 0) throw new AppError(422, 'CSV has no data rows', 'EMPTY_FILE');

      // Resolve institution for new-program creation
      const instOverride = (req.body?.institution_id as string | undefined) ?? null;
      let institutionId: string;
      if (instOverride) {
        const { rows: inst } = await db.query(
          `SELECT id FROM org.institutions WHERE id = $1`,
          [instOverride]
        );
        if (inst.length === 0) throw new AppError(404, 'Institution not found', 'NOT_FOUND');
        institutionId = inst[0].id;
      } else {
        const { rows: inst } = await db.query(
          `SELECT id FROM org.institutions ORDER BY created_at LIMIT 1`
        );
        if (inst.length === 0) {
          throw new AppError(
            422,
            'No institution exists. Create one first or pass institution_id.',
            'NO_INSTITUTION'
          );
        }
        institutionId = inst[0].id;
      }

      const summary = {
        total_rows: rows.length,
        successful: 0,
        failed: 0,
        skipped: 0,
        created_students: 0,
        updated_students: 0,
        already_enrolled: 0,
        created_programs: 0,
        created_sub_programs: 0,
        errors: [] as Array<{ row: number; email: string; reason: string }>,
      };

      const seenEmails = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2; // human-readable; +1 for 1-index, +1 for header
        const row = rows[i];

        const name       = (row['name']    ?? '').trim();
        const rawEmail   = (row['email']   ?? '').trim();
        const program    = (row['program'] ?? '').trim();
        const subProg    = (
          row['sub_program'] ?? row['subprogram'] ?? row['sub-program'] ?? row['specialization'] ?? ''
        ).trim();
        const rollInput  = (row['roll_number'] ?? row['rollnumber'] ?? '').trim();
        // Password used only for bcrypt.hash() — never stored in a longer-lived variable.
        const passwordRaw = (row['password'] ?? '').trim();

        // Row validation
        const errs: string[] = [];
        if (!name)        errs.push('name is required');
        if (!rawEmail)    errs.push('email is required');
        if (!program)     errs.push('program is required');
        if (!passwordRaw) errs.push('password is required');
        else if (passwordRaw.length < 8) errs.push('password must be at least 8 characters');
        if (rawEmail && !z.string().email().safeParse(rawEmail).success) errs.push('email is invalid');

        if (errs.length > 0) {
          summary.failed++;
          summary.errors.push({ row: rowNum, email: rawEmail || '(missing)', reason: errs.join('; ') });
          continue;
        }

        const email = rawEmail.toLowerCase();

        if (seenEmails.has(email)) {
          summary.skipped++;
          summary.errors.push({
            row: rowNum,
            email,
            reason: 'duplicate email in file — skipped (first occurrence was processed)',
          });
          continue;
        }
        seenEmails.add(email);

        const client = await db.connect();
        try {
          await client.query('BEGIN');

          // Step 1 — find or create program
          const { rows: exProgs } = await client.query(
            `SELECT id FROM org.programs WHERE LOWER(name) = LOWER($1) AND institution_id = $2`,
            [program, institutionId]
          );
          let programId: string;
          if (exProgs.length > 0) {
            programId = exProgs[0].id;
          } else {
            const { rows: np } = await client.query(
              `INSERT INTO org.programs (institution_id, name, code)
               VALUES ($1, $2, $3)
               ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name
               RETURNING id`,
              [institutionId, program, _toCode(program)]
            );
            programId = np[0].id;
            summary.created_programs++;
          }

          // Step 2 — find or create default IMPORT batch for this program
          const { rows: exBatch } = await client.query(
            `SELECT id FROM org.batches WHERE program_id = $1 AND name = 'IMPORT' AND track = 'IMPORT'`,
            [programId]
          );
          let batchId: string;
          if (exBatch.length > 0) {
            batchId = exBatch[0].id;
          } else {
            const { rows: nb } = await client.query(
              `INSERT INTO org.batches (program_id, name, year, track)
               VALUES ($1, 'IMPORT', $2, 'IMPORT')
               ON CONFLICT DO NOTHING
               RETURNING id`,
              [programId, new Date().getFullYear()]
            );
            if (nb.length > 0) {
              batchId = nb[0].id;
            } else {
              // Concurrent insert already created it — fetch
              const { rows: rb } = await client.query(
                `SELECT id FROM org.batches WHERE program_id = $1 AND name = 'IMPORT' AND track = 'IMPORT'`,
                [programId]
              );
              batchId = rb[0].id;
            }
          }

          // Step 3 — find or create sub-program
          let subProgramId: string | null = null;
          if (subProg) {
            const { rows: exSub } = await client.query(
              `SELECT id FROM org.sub_programs WHERE LOWER(name) = LOWER($1) AND program_id = $2`,
              [subProg, programId]
            );
            if (exSub.length > 0) {
              subProgramId = exSub[0].id;
            } else {
              const { rows: ns } = await client.query(
                `INSERT INTO org.sub_programs (program_id, name, code)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (program_id, code) DO UPDATE SET name = EXCLUDED.name
                 RETURNING id`,
                [programId, subProg, _toCode(subProg)]
              );
              subProgramId = ns[0].id;
              summary.created_sub_programs++;
            }
          }

          // Step 4 — resolve or create user + student + enrollment
          const { rows: exUsers } = await client.query(
            `SELECT id FROM identity.users WHERE email = $1`,
            [email]
          );

          let userId: string;
          let studentId: string;
          let outcome: 'created' | 'updated' | 'already_enrolled';

          if (exUsers.length > 0) {
            // Existing user
            userId = exUsers[0].id;
            const { rows: exStu } = await client.query(
              `SELECT id FROM org.students WHERE user_id = $1`,
              [userId]
            );
            if (exStu.length === 0) {
              const { rows: ns } = await client.query(
                `INSERT INTO org.students (user_id, roll_number, batch_id)
                 VALUES ($1, $2, $3) RETURNING id`,
                [userId, rollInput || _genRoll(), batchId]
              );
              studentId = ns[0].id;
            } else {
              studentId = exStu[0].id;
            }

            const { rows: exEnroll } = await client.query(
              `SELECT id, sub_program_id FROM org.student_programs
               WHERE student_id = $1 AND program_id = $2`,
              [studentId, programId]
            );
            if (exEnroll.length > 0) {
              const same = exEnroll[0].sub_program_id === subProgramId ||
                (exEnroll[0].sub_program_id == null && subProgramId == null);
              if (same) {
                outcome = 'already_enrolled';
                summary.already_enrolled++;
              } else {
                await client.query(
                  `UPDATE org.student_programs SET sub_program_id = $1, enrolled_at = now()
                   WHERE student_id = $2 AND program_id = $3`,
                  [subProgramId, studentId, programId]
                );
                outcome = 'updated';
                summary.updated_students++;
              }
            } else {
              await client.query(
                `INSERT INTO org.student_programs (student_id, program_id, sub_program_id)
                 VALUES ($1, $2, $3)`,
                [studentId, programId, subProgramId]
              );
              outcome = 'updated';
              summary.updated_students++;
            }
          } else {
            // New user
            const passwordHash = await bcrypt.hash(passwordRaw, 10);
            const { rows: nu } = await client.query(
              `INSERT INTO identity.users (name, email, password_hash, role, token_version, status)
               VALUES ($1, $2, $3, 'STUDENT', 0, 'ACTIVE') RETURNING id`,
              [name, email, passwordHash]
            );
            userId = nu[0].id;

            const { rows: ns } = await client.query(
              `INSERT INTO org.students (user_id, roll_number, batch_id)
               VALUES ($1, $2, $3) RETURNING id`,
              [userId, rollInput || _genRoll(), batchId]
            );
            studentId = ns[0].id;

            await client.query(
              `INSERT INTO org.student_programs (student_id, program_id, sub_program_id)
               VALUES ($1, $2, $3)`,
              [studentId, programId, subProgramId]
            );

            outcome = 'created';
            summary.created_students++;
          }

          await client.query('COMMIT');
          summary.successful++;

          // Emit after commit so a handler failure cannot roll back the import row
          if (outcome === 'created') {
            const payload: UserRegisteredPayload = { userId, studentId, email, name };
            eventBus.emit(Events.USER_REGISTERED, payload);
          }
        } catch (rowErr: unknown) {
          await client.query('ROLLBACK');
          summary.failed++;
          const msg = rowErr instanceof Error ? rowErr.message : 'Unknown error';
          summary.errors.push({ row: rowNum, email, reason: msg });
        } finally {
          client.release();
        }
      }

      sendSuccess(res, { summary });
    } catch (err) {
      sendError(res, err);
    }
  }
);
