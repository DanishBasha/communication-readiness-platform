/**
 * Integration tests for auth routes and RBAC guards.
 * Requires a live PostgreSQL at DATABASE_URL (defaults to the dev DB).
 * Each test that inserts data uses a unique timestamped email to avoid conflicts.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/config/database';

// Seeded batch ID from the dev database
const BATCH_ID = 'c8ebcfc6-16a2-4dcc-be52-c18de17fa081';

// ─── helpers ────────────────────────────────────────────────────────────────

function uniqueEmail(tag = 'u'): string {
  return `test_${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.com`;
}

async function registerUser(
  email = uniqueEmail(),
  password = 'Password123!'
): Promise<{ token: string; studentId: string; userId: string; email: string }> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test User',
      email,
      password,
      rollNumber: `ROLL_${Date.now()}`,
      batchId: BATCH_ID,
    });
  if (res.status !== 201) {
    throw new Error(`Register failed ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.data.token,
    studentId: res.body.data.studentId,
    userId: res.body.data.user.id,
    email,
  };
}

// ─── teardown ────────────────────────────────────────────────────────────────

// Track inserted user IDs for cleanup so we don't leave test data behind
const insertedUserIds: string[] = [];

afterAll(async () => {
  if (insertedUserIds.length > 0) {
    // Delete students first (FK), then users
    await db.query(
      `DELETE FROM org.students WHERE user_id = ANY($1::uuid[])`,
      [insertedUserIds]
    ).catch(() => {});
    await db.query(
      `DELETE FROM identity.users WHERE id = ANY($1::uuid[])`,
      [insertedUserIds]
    ).catch(() => {});
  }
  await db.end();
});

// ─── 1. Register — happy path ─────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('creates user + student row → 201 with token and studentId', async () => {
    const email = uniqueEmail('reg');
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Integration Tester',
        email,
        password: 'Password123!',
        rollNumber: `ROLL_REG_${Date.now()}`,
        batchId: BATCH_ID,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.studentId).toBeTruthy();
    expect(res.body.data.user.email).toBe(email.toLowerCase());
    expect(res.body.data.user.role).toBe('STUDENT');

    insertedUserIds.push(res.body.data.user.id);
  });
});

// ─── 2. Duplicate email → 409 ─────────────────────────────────────────────────

describe('POST /api/auth/register — duplicate email', () => {
  it('returns 409 DUPLICATE_EMAIL', async () => {
    const email = uniqueEmail('dup');
    const { userId } = await registerUser(email);
    insertedUserIds.push(userId);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Dup User',
        email,
        password: 'Password123!',
        rollNumber: `ROLL_DUP_${Date.now()}`,
        batchId: BATCH_ID,
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_EMAIL');
  });
});

// ─── 3. Login — correct credentials → 200 ────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 with token on correct credentials', async () => {
    const email = uniqueEmail('login');
    const password = 'Password123!';
    const { userId } = await registerUser(email, password);
    insertedUserIds.push(userId);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe(email.toLowerCase());
  });
});

// ─── 4. Login — wrong password → 401 ─────────────────────────────────────────

describe('POST /api/auth/login — wrong password', () => {
  it('returns 401 INVALID_CREDENTIALS', async () => {
    const email = uniqueEmail('badpw');
    const { userId } = await registerUser(email, 'CorrectPass1!');
    insertedUserIds.push(userId);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword99!' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });
});

// ─── 5. GET /api/auth/me — valid token ───────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns 200 with user data on valid token', async () => {
    const email = uniqueEmail('me');
    const { token, userId } = await registerUser(email);
    insertedUserIds.push(userId);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email.toLowerCase());
  });
});

// ─── 6. GET /api/auth/me — invalid token → 401 ───────────────────────────────

describe('GET /api/auth/me — invalid token', () => {
  it('returns 401 on bogus token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.valid');

    expect(res.status).toBe(401);
  });
});

// ─── 7. Logout + revoked token → 401 TOKEN_REVOKED ───────────────────────────

describe('POST /api/auth/logout', () => {
  it('after logout, old token returns 401 TOKEN_REVOKED', async () => {
    const email = uniqueEmail('logout');
    const { token, userId } = await registerUser(email);
    insertedUserIds.push(userId);

    // Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    // Old token should be revoked
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(401);
    expect(meRes.body.code).toBe('TOKEN_REVOKED');
  });
});

// ─── 8. GET /api/students/:id by owner → 200 ─────────────────────────────────

describe('GET /api/students/:id', () => {
  it('returns 200 when accessed by the owning student', async () => {
    const email = uniqueEmail('student-own');
    const { token, studentId, userId } = await registerUser(email);
    insertedUserIds.push(userId);

    const res = await request(app)
      .get(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.student.id).toBe(studentId);
  });
});

// ─── 9. PATCH /api/students/:id by different student → 403 ───────────────────

describe('PATCH /api/students/:id — cross-student', () => {
  it('returns 403 FORBIDDEN when a different student attempts update', async () => {
    // Owner
    const emailA = uniqueEmail('owner');
    const { studentId, userId: userIdA } = await registerUser(emailA);
    insertedUserIds.push(userIdA);

    // Attacker
    const emailB = uniqueEmail('attacker');
    const { token: tokenB, userId: userIdB } = await registerUser(emailB);
    insertedUserIds.push(userIdB);

    const res = await request(app)
      .patch(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ codingHandles: { github: 'attacker' } });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

// ─── 10. GET /api/admin/users as STUDENT → 403 ───────────────────────────────

describe('GET /api/admin/users — STUDENT role', () => {
  it('returns 403 FORBIDDEN for a STUDENT', async () => {
    const email = uniqueEmail('admin-deny');
    const { token, userId } = await registerUser(email);
    insertedUserIds.push(userId);

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});
