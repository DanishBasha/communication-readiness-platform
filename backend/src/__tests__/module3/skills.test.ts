/**
 * Route-level tests for /api/skills using supertest.
 * DB is mocked; no live Postgres required.
 */
import express from 'express';
import request from 'supertest';

// ── Mock DB ───────────────────────────────────────────────────────────────────
const mockQuery = jest.fn();
jest.mock('../../shared/db/pool', () => ({ db: { query: mockQuery } }));

// ── Mock authenticate (module is imported for its AuthRequest type) ────────────
jest.mock('../../middleware/authenticate', () => ({
  authenticate: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  AuthRequest: {},
}));

import { skillsRouter } from '../../routes/skills.routes';

// Inject req.user before the router so requireRole can read it
const adminUser = { id: 'user-1', role: 'PROGRAM_ADMIN', name: 'Admin', email: 'admin@test.com', tokenVersion: 0 };

const app = express();
app.use(express.json());
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((req: any, _res: express.Response, next: express.NextFunction) => { req.user = adminUser; next(); });
app.use('/skills', skillsRouter);

const SKILL_FIXTURE = {
  id: 'skill-uuid-1',
  category: 'TECHNICAL',
  name: 'System Design',
  description: 'Scalable system design',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  mockQuery.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /skills', () => {
  it('returns list of skills', async () => {
    mockQuery.mockResolvedValue({ rows: [SKILL_FIXTURE] });
    const res = await request(app).get('/skills');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.skills).toHaveLength(1);
  });

  it('filters by category when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [SKILL_FIXTURE] });
    const res = await request(app).get('/skills?category=TECHNICAL');
    expect(res.status).toBe(200);
    const callArgs = mockQuery.mock.calls[0][0] as string;
    expect(callArgs).toContain('category');
  });

  it('returns 200 with empty list for unknown category', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/skills?category=INVALID_CAT');
    expect(res.status).toBe(200);
    expect(res.body.data.skills).toHaveLength(0);
  });
});

describe('GET /skills/:id', () => {
  it('returns a skill by id', async () => {
    mockQuery.mockResolvedValue({ rows: [SKILL_FIXTURE] });
    const res = await request(app).get('/skills/skill-uuid-1');
    expect(res.status).toBe(200);
    expect(res.body.data.skill.name).toBe('System Design');
  });

  it('returns 404 when skill not found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).get('/skills/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('POST /skills', () => {
  it('creates a skill and returns 201', async () => {
    mockQuery.mockResolvedValue({ rows: [SKILL_FIXTURE] });
    const res = await request(app).post('/skills').send({
      category: 'TECHNICAL',
      name: 'System Design',
      description: 'Scalable system design',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.skill.name).toBe('System Design');
  });

  it('returns 422 for missing required fields', async () => {
    const res = await request(app).post('/skills').send({ name: 'Missing Category' });
    expect(res.status).toBe(422);
  });

  it('returns 409 on duplicate name', async () => {
    mockQuery.mockRejectedValue({ code: '23505' });
    const res = await request(app).post('/skills').send({
      category: 'TECHNICAL',
      name: 'System Design',
    });
    expect(res.status).toBe(409);
  });
});

describe('PUT /skills/:id', () => {
  it('updates a skill', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'skill-uuid-1' }] }) // existence check
      .mockResolvedValueOnce({ rows: [{ ...SKILL_FIXTURE, name: 'Updated Name' }] }); // update
    const res = await request(app).put('/skills/skill-uuid-1').send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
  });

  it('returns 404 when skill does not exist', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).put('/skills/nonexistent').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /skills/:id', () => {
  it('soft-deletes (deactivates) a skill', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 'skill-uuid-1' }] });
    const res = await request(app).delete('/skills/skill-uuid-1');
    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('deactivated');
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('is_active = false');
  });

  it('returns 404 when skill not found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).delete('/skills/nonexistent');
    expect(res.status).toBe(404);
  });
});
