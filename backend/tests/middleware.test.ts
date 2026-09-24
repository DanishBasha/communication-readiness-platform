/**
 * Unit tests for authenticate and requireRole middleware.
 * The database pool is mocked — no live DB required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ── Mock the db pool before importing middleware ─────────────────────────────

vi.mock('../src/config/database', () => ({
  db: {
    query: vi.fn(),
  },
}));

// Import AFTER mock registration
import { authenticate, AuthRequest } from '../src/middleware/authenticate';
import { requireRole } from '../src/middleware/authorize';
import { db } from '../src/config/database';

// ── helpers ──────────────────────────────────────────────────────────────────

const JWT_SECRET = 'dev-secret-change-in-production-min-32-chars';

// Set env so the module reads the same secret
process.env.JWT_SECRET = JWT_SECRET;
process.env.DATABASE_URL = 'postgresql://tamildev:123_TamiL_321@127.0.0.1:5422/comm_readiness';

function makeToken(overrides: Partial<{
  id: string; email: string; role: string; name: string;
  tokenVersion: number; expiresIn: string;
}> = {}): string {
  const {
    id = 'user-uuid-1234',
    email = 'user@test.com',
    role = 'STUDENT',
    name = 'Test User',
    tokenVersion = 0,
    expiresIn = '1h',
  } = overrides;

  return jwt.sign({ id, email, role, name, tokenVersion }, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

function mockReq(authHeader?: string, params: Record<string, string> = {}): AuthRequest {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    params,
  } as unknown as AuthRequest;
}

function mockRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

const mockNext: NextFunction = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  it('valid token + matching token_version → calls next()', async () => {
    const token = makeToken({ tokenVersion: 3 });
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    const next = vi.fn();

    (db.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [{ token_version: 3, status: 'ACTIVE' }],
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeDefined();
    expect(req.user!.role).toBe('STUDENT');
  });

  it('valid token + mismatched token_version → 401 TOKEN_REVOKED', async () => {
    const token = makeToken({ tokenVersion: 1 });
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    const next = vi.fn();

    (db.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [{ token_version: 5, status: 'ACTIVE' }],
    });

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect((res.body as { code: string }).code).toBe('TOKEN_REVOKED');
  });

  it('missing Authorization header → 401 UNAUTHENTICATED', async () => {
    const req = mockReq(undefined);
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect((res.body as { code: string }).code).toBe('UNAUTHENTICATED');
  });

  it('expired token → 401', async () => {
    // Create a token that expired in the past
    const token = jwt.sign(
      { id: 'x', email: 'x@test.com', role: 'STUDENT', name: 'X', tokenVersion: 0 },
      JWT_SECRET,
      { expiresIn: -1 } as jwt.SignOptions // expired immediately
    );
    const req = mockReq(`Bearer ${token}`);
    const res = mockRes();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});

// ─── requireRole ─────────────────────────────────────────────────────────────

describe('requireRole middleware', () => {
  it('STUDENT role accessing PROGRAM_ADMIN route → 403 FORBIDDEN', () => {
    const req = mockReq() as AuthRequest;
    req.user = { id: 'u1', email: 'a@b.com', role: 'STUDENT', name: 'A', tokenVersion: 0 };
    const res = mockRes();
    const next = vi.fn();

    requireRole('PROGRAM_ADMIN')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect((res.body as { code: string }).code).toBe('FORBIDDEN');
  });

  it('PROGRAM_ADMIN role accessing PROGRAM_ADMIN route → calls next()', () => {
    const req = mockReq() as AuthRequest;
    req.user = { id: 'u2', email: 'admin@b.com', role: 'PROGRAM_ADMIN', name: 'Admin', tokenVersion: 0 };
    const res = mockRes();
    const next = vi.fn();

    requireRole('PROGRAM_ADMIN')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
