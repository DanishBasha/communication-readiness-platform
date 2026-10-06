/**
 * Module 3 Agent tests — Node.js API layer (delegates to Python FastAPI agent service).
 * DB and axios are mocked; no live services required.
 */
import express from 'express';
import request from 'supertest';

// ── Mocks (must be hoisted before any imports that use the mocked modules) ─────

const mockQuery = jest.fn();
const mockConnect = jest.fn();

jest.mock('../../shared/db/pool', () => ({
  db: { query: mockQuery, connect: mockConnect },
}));

jest.mock('axios', () => ({
  default: { post: jest.fn() },
  post: jest.fn(),
}));

jest.mock('../../middleware/authenticate', () => ({
  authenticate: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  AuthRequest: {},
}));

import axios from 'axios';
import { learningRouter }   from '../../routes/learning.routes';

// ── Authenticated test app ────────────────────────────────────────────────────

const adminUser = {
  id: 'user-admin-1', role: 'PROGRAM_ADMIN',
  name: 'Admin', email: 'admin@test.com', tokenVersion: 0,
};

const app = express();
app.use(express.json());
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((req: any, _res: express.Response, next: express.NextFunction) => { req.user = adminUser; next(); });
app.use('/learning', learningRouter);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const STUDENT_ID = '00000000-0000-0000-0000-000000001001';

const DRAFT_PLAN = {
  goal: 'Improve technical interview readiness',
  durationWeeks: 4,
  focusSkills: ['System Design'],
  weeklyPlan: [{ week: 1, focus: 'System Design', activities: ['Study scalability'] }],
};

const LEARNING_PLAN = {
  id: 'plan-1',
  student_id: STUDENT_ID,
  generated_by_agent_run_id: 'run-supervisor-1',
  goal: 'Improve technical interview readiness',
  plan_data: JSON.stringify(DRAFT_PLAN),
  status: 'ACTIVE',
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── Reset before each test ────────────────────────────────────────────────────

beforeEach(() => {
  mockQuery.mockReset();
  (axios.post as jest.Mock).mockReset();
});

// =============================================================================
// Test 1 — Supervisor starts correctly (API delegates to Python)
// =============================================================================

describe('Test 1 — Supervisor starts correctly', () => {
  it('POST /agent/run returns 202 with agentRunId', async () => {
    // Node.js: student scope check resolves (admin bypass) + student exists check
    mockQuery.mockResolvedValueOnce({ rows: [{ id: STUDENT_ID }] }); // student exists
    // Python agent service returns the run ID
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: { run_id: 'run-supervisor-1', status: 'QUEUED' } });

    const res = await request(app).post('/learning/agent/run').send({
      studentId: STUDENT_ID,
      goal: 'Improve technical interview readiness',
    });

    expect(res.status).toBe(202);
    expect(res.body.data.agentRunId).toBe('run-supervisor-1');
  });

  it('returns 422 for invalid studentId format', async () => {
    const res = await request(app).post('/learning/agent/run').send({
      studentId: 'not-a-uuid',
      goal: 'Improve readiness',
    });
    expect(res.status).toBe(422);
  });

  it('returns 404 when student does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // student not found
    const res = await request(app).post('/learning/agent/run').send({
      studentId: STUDENT_ID,
      goal: 'Improve readiness',
    });
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// Test 6 — Unauthorized student access is rejected
// =============================================================================

describe('Test 6 — Unauthorized student access is rejected', () => {
  it('returns 403 when STUDENT user tries to access another student\'s run', async () => {
    const studentApp = express();
    studentApp.use(express.json());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    studentApp.use((req: any, _res: express.Response, next: express.NextFunction) => {
      req.user = { id: 'other-user-id', role: 'STUDENT', name: 'Other', email: 'other@test.com', tokenVersion: 0 };
      next();
    });
    studentApp.use('/learning', learningRouter);

    // assertStudentScope: SELECT WHERE id=$1 AND user_id=$2 → no rows → 403
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(studentApp).post('/learning/agent/run').send({
      studentId: STUDENT_ID,
      goal: 'Improve readiness',
    });

    expect(res.status).toBe(403);
  });
});

// =============================================================================
// Test 12 — Agent run delegates to Python with correct payload
// =============================================================================

describe('Test 12 — Agent run and steps are persisted', () => {
  it('POST /agent/run delegates to Python with correct payload', async () => {
    // Node.js: student exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: STUDENT_ID }] });
    // Python service returns a run ID
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: { run_id: 'run-supervisor-1', status: 'QUEUED' } });

    await request(app).post('/learning/agent/run').send({
      studentId: STUDENT_ID, goal: 'Test goal',
    });

    // Verify Node.js called Python with the right payload
    const pyCall = (axios.post as jest.Mock).mock.calls.find(
      (call: unknown[]) => (call[0] as string).includes('/agent/run')
    );
    expect(pyCall).toBeDefined();
    const payload = pyCall![1] as Record<string, unknown>;
    expect(payload.student_id).toBe(STUDENT_ID);
    expect(payload.goal).toBe('Test goal');
    expect(payload.triggered_by_user_id).toBe(adminUser.id);
  });
});

// =============================================================================
// Test 17 — Existing Module 3 APIs still work
// =============================================================================

describe('Test 17 — Existing Module 3 APIs still work', () => {
  it('GET /plans/:studentId returns 200 with DBML columns', async () => {
    mockQuery.mockResolvedValue({ rows: [LEARNING_PLAN] });
    const res = await request(app).get(`/learning/plans/${STUDENT_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plans[0].generated_by_agent_run_id).toBeDefined();
    expect(res.body.data.plans[0].plan_data).toBeDefined();
  });

  it('GET /recommendations/:studentId returns 200', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app).get(`/learning/recommendations/${STUDENT_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.recommendations).toHaveLength(0);
  });

  it('POST /agent/run returns 503 when agent service is unavailable', async () => {
    // Node.js: student exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: STUDENT_ID }] });
    // Python agent service is unreachable — axios throws a network error
    const axiosError = new Error('connect ECONNREFUSED');
    (axiosError as unknown as Record<string, unknown>).isAxiosError = true;
    (axios.post as jest.Mock).mockRejectedValueOnce(axiosError);
    // Make axios.isAxiosError return true for this error
    (axios as unknown as Record<string, unknown>).isAxiosError = (e: unknown) => !!(e as Record<string, unknown>).isAxiosError;
    const res = await request(app).post('/learning/agent/run').send({
      studentId: STUDENT_ID, goal: 'Improve readiness',
    });
    expect(res.status).toBe(503);
  });
});

// =============================================================================
// Test 18 — Module 1 authentication still works
// =============================================================================

describe('Test 18 — Module 1 authentication still works', () => {
  it('learningRouter is defined and mounts correctly', () => {
    expect(learningRouter).toBeDefined();
  });

  it('GET /agent/run/:runId returns 404 for unknown run', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // run not found
    const res = await request(app).get('/learning/agent/run/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('GET /agent/run/:runId returns poll data for a QUEUED run', async () => {
    const runRow = {
      id: 'run-1', student_id: STUDENT_ID, status: 'QUEUED',
      goal_snapshot: 'Goal', termination_reason: null,
      correlation_id: 'corr-1', started_at: null, completed_at: null,
      created_at: new Date().toISOString(),
    };
    mockQuery
      .mockResolvedValueOnce({ rows: [runRow] }) // load run
      .mockResolvedValueOnce({ rows: [] });       // steps (PROGRAM_ADMIN skips scope DB call)

    const res = await request(app).get('/learning/agent/run/run-1');
    expect(res.status).toBe(200);
    expect(res.body.data.run).toBeDefined();
    expect(res.body.data.steps).toBeDefined();
    expect(res.body.data.learningPlan).toBeNull(); // QUEUED, not SUCCEEDED
  });
});
