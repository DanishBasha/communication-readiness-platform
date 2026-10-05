/**
 * Module 3 — End-to-End verification tests.
 *
 * Exercises the full Module 2 → Module 3 pipeline using DBML-compliant mock
 * fixtures.  No live DB or LLM required — pool, connect, and axios are mocked.
 *
 * Coverage:
 *  - USER_REGISTERED handler: creates profile, idempotent on duplicate
 *  - ATTEMPT_COMPLETED handler: snapshot + skill_performances + running avg + trend
 *  - Duplicate ATTEMPT_COMPLETED: idempotent exit (existing snapshot check)
 *  - ATTEMPT_COMPLETED without assessment_report: graceful degradation
 *  - Cross-student 403 for all 7 protected endpoints
 *  - recoverDeadRuns(): marks stuck RUNNING runs as DEAD
 *  - Listening story POST: audio stored in metadata.audio_url via LocalStorageClient
 *  - Listening story POST: no audio → metadata unchanged, no error
 */

// ── Mock the DB pool (must be hoisted) ────────────────────────────────────────

const mockQuery   = jest.fn();
const mockConnect = jest.fn();

jest.mock('../../shared/db/pool', () => ({
  db: { query: mockQuery, connect: mockConnect },
}));

// ── Mock LocalStorageClient for listening-route audio tests ───────────────────

const mockUpload = jest.fn();
jest.mock('../../shared/storage/LocalStorageClient', () => ({
  LocalStorageClient: jest.fn().mockImplementation(() => ({
    upload: mockUpload,
  })),
}));

// ── Mock the eventBus so registerModule3Handlers doesn't subscribe ─────────────

jest.mock('../../shared/events/eventBus', () => ({
  eventBus: { on: jest.fn() },
}));

// ── Mock authenticate middleware (inject user into every request) ─────────────

jest.mock('../../middleware/authenticate', () => ({
  authenticate: (_req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => next(),
  AuthRequest: {},
}));

import express                 from 'express';
import request                 from 'supertest';
import { handleUserRegistered, handleAttemptCompleted } from '../../shared/events/module3Handlers';
import { recoverDeadRuns }      from '../../agents/agentRunner';
import { learningRouter }       from '../../routes/learning.routes';
import { performanceRouter }    from '../../routes/performance.routes';
import { listeningRouter }      from '../../routes/listening.routes';

// ── Fixed dev-seed IDs (match 036_dev_seed.sql) ───────────────────────────────

const ALICE_USER_ID    = '50000000-0000-0000-0000-000000000002';
const ALICE_STUDENT_ID = '60000000-0000-0000-0000-000000000001';
const BOB_STUDENT_ID   = '60000000-0000-0000-0000-000000000099'; // different student
const ATTEMPT_ID       = 'a1000000-0000-0000-0000-000000000001';
const PROGRAM_ID       = '20000000-0000-0000-0000-000000000001';
const BATCH_ID         = '30000000-0000-0000-0000-000000000001';
const SUBDIVISION_ID   = '40000000-0000-0000-0000-000000000001';

// ── Assessment report with skill_scores (matches seed CTE output shape) ───────

const SKILL_ID_1 = 'b1000000-0000-0000-0000-000000000001';
const SKILL_ID_2 = 'b1000000-0000-0000-0000-000000000002';
const SKILL_ID_3 = 'b1000000-0000-0000-0000-000000000003';

const ASSESSMENT_REPORT_SKILL_SCORES = {
  [SKILL_ID_1]: { score: 45.0, proficiency_level: 'BEGINNER' },
  [SKILL_ID_2]: { score: 52.0, proficiency_level: 'BEGINNER' },
  [SKILL_ID_3]: { score: 67.0, proficiency_level: 'INTERMEDIATE' },
};

const ASSESSMENT_REPORT = {
  component_scores: { TECHNICAL: 48.0, COMMUNICATION: 71.0, LISTENING: 65.0 },
  skill_scores: ASSESSMENT_REPORT_SKILL_SCORES,
};

const ATTEMPT_PAYLOAD = {
  attemptId:          ATTEMPT_ID,
  studentId:          ALICE_STUDENT_ID,
  programId:          PROGRAM_ID,
  batchId:            BATCH_ID,
  subdivisionId:      SUBDIVISION_ID,
  overallScore:       61.3,
  technicalScore:     48.0,
  communicationScore: 71.0,
  listeningScore:     65.0,
};

// ── Mock client builder ───────────────────────────────────────────────────────

function makeClient(responses: Array<{ rows: unknown[]; rowCount?: number }>) {
  let callIndex = 0;
  const clientQuery = jest.fn().mockImplementation(() => {
    const resp = responses[callIndex] ?? { rows: [], rowCount: 0 };
    callIndex++;
    return Promise.resolve(resp);
  });
  return { query: clientQuery, release: jest.fn() };
}

// ── Express app for HTTP endpoint tests ──────────────────────────────────────

function buildApp(user: Record<string, unknown>) {
  const a = express();
  a.use(express.json());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a.use((req: any, _res: express.Response, next: express.NextFunction) => { req.user = user; next(); });
  a.use('/learning',     learningRouter);
  a.use('/performance',  performanceRouter);
  a.use('/listening',    listeningRouter);
  return a;
}

const aliceApp    = buildApp({ id: ALICE_USER_ID, role: 'STUDENT',  studentId: ALICE_STUDENT_ID });
const intruderApp = buildApp({ id: 'other-user-1', role: 'STUDENT', studentId: BOB_STUDENT_ID   });
const adminApp    = buildApp({ id: 'admin-user-1', role: 'PROGRAM_ADMIN' });

// ── Reset mocks ───────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQuery.mockReset();
  mockConnect.mockReset();
  mockUpload.mockReset();
});

// =============================================================================
// 1. USER_REGISTERED — creates performance profile
// =============================================================================

describe('USER_REGISTERED handler', () => {
  it('inserts performance_profiles row for a student', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await handleUserRegistered({ userId: ALICE_USER_ID, studentId: ALICE_STUDENT_ID, email: 'alice@demo.local', name: 'Alice Seed' });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO performance.performance_profiles'),
      [ALICE_STUDENT_ID]
    );
  });

  it('skips when studentId is empty string (non-student registration)', async () => {
    await handleUserRegistered({ userId: 'some-admin-id', studentId: '', email: 'admin@test.com', name: 'Admin' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('is idempotent: second call with same studentId does not throw', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await handleUserRegistered({ userId: ALICE_USER_ID, studentId: ALICE_STUDENT_ID, email: 'alice@demo.local', name: 'Alice Seed' });
    await handleUserRegistered({ userId: ALICE_USER_ID, studentId: ALICE_STUDENT_ID, email: 'alice@demo.local', name: 'Alice Seed' });
    // Both calls go through (DB enforces ON CONFLICT DO NOTHING); handler never throws
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// 2. ATTEMPT_COMPLETED — full snapshot + skill_performances + running avg + trend
// =============================================================================

describe('ATTEMPT_COMPLETED handler', () => {
  function makeClientWithReport() {
    // Client query sequence (in transactional order):
    // 0: BEGIN
    // 1: idempotency check → no existing snapshot
    // 2: assessment_reports query → returns report with skill_scores
    // 3: INSERT performance_snapshots
    // 4-6: INSERT skill_performances (3 skills)
    // 7: SELECT performance_profiles + snap_count → profile with 1 snap
    // 8: SELECT trend snapshots (last 6)
    // 9: UPDATE performance_profiles
    // 10: COMMIT
    return makeClient([
      { rows: [] },                                    // BEGIN
      { rows: [] },                                    // idempotency check → no match
      { rows: [ASSESSMENT_REPORT] },                   // assessment_reports
      { rows: [], rowCount: 1 },                       // INSERT performance_snapshots
      { rows: [], rowCount: 1 },                       // INSERT skill_perf skill 1
      { rows: [], rowCount: 1 },                       // INSERT skill_perf skill 2
      { rows: [], rowCount: 1 },                       // INSERT skill_perf skill 3
      { rows: [{ technical_score: null, communication_score: null, listening_score: null, overall_score: null, snap_count: '1' }] },
      { rows: [{ overall_score: '61.3' }] },            // trend window
      { rows: [], rowCount: 1 },                       // UPDATE profiles
      { rows: [] },                                    // COMMIT
    ]);
  }

  it('populates snapshot with component_scores and skill_scores from assessment_report', async () => {
    const client = makeClientWithReport();
    mockConnect.mockResolvedValue(client);

    await handleAttemptCompleted(ATTEMPT_PAYLOAD);

    // Snapshot INSERT should include component_scores and skill_scores
    const snapshotCall = (client.query as jest.Mock).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO performance.performance_snapshots')
    );
    expect(snapshotCall).toBeDefined();
    const snapshotArgs = snapshotCall![1] as unknown[];
    // args[9] = component_scores JSON, args[10] = skill_scores JSON
    expect(snapshotArgs[9]).toContain('TECHNICAL');
    expect(snapshotArgs[10]).toContain(SKILL_ID_1);
  });

  it('inserts one skill_performances row per skill in assessment_report.skill_scores', async () => {
    const client = makeClientWithReport();
    mockConnect.mockResolvedValue(client);

    await handleAttemptCompleted(ATTEMPT_PAYLOAD);

    const skillInserts = (client.query as jest.Mock).mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO performance.skill_performances')
    );
    // 3 skills in ASSESSMENT_REPORT_SKILL_SCORES
    expect(skillInserts).toHaveLength(3);
  });

  it('skill_performances rows use correct skill_ids and source=ASSESSMENT literal in SQL', async () => {
    const client = makeClientWithReport();
    mockConnect.mockResolvedValue(client);

    await handleAttemptCompleted(ATTEMPT_PAYLOAD);

    const skillInserts = (client.query as jest.Mock).mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO performance.skill_performances')
    );
    const insertedSkillIds = skillInserts.map((c: unknown[]) => (c[1] as unknown[])[1]);
    expect(insertedSkillIds).toContain(SKILL_ID_1);
    expect(insertedSkillIds).toContain(SKILL_ID_2);
    expect(insertedSkillIds).toContain(SKILL_ID_3);

    // source is a SQL literal 'ASSESSMENT' embedded in the SQL string, not a param
    skillInserts.forEach((c: unknown[]) => {
      expect(c[0] as string).toContain("'ASSESSMENT'");
    });
  });

  it('calculates running average for the first snapshot', async () => {
    const client = makeClientWithReport();
    mockConnect.mockResolvedValue(client);

    await handleAttemptCompleted(ATTEMPT_PAYLOAD);

    const profileUpdate = (client.query as jest.Mock).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('UPDATE performance.performance_profiles')
    );
    expect(profileUpdate).toBeDefined();
    // With snap_count=1 and previous overall=null, new avg = overallScore = 61.3
    const args = profileUpdate![1] as number[];
    expect(args[4]).toBeCloseTo(61.3, 1);
  });

  it('calculates trend correctly from snapshot history', async () => {
    const client = makeClientWithReport();
    mockConnect.mockResolvedValue(client);

    await handleAttemptCompleted(ATTEMPT_PAYLOAD);

    const profileUpdate = (client.query as jest.Mock).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('UPDATE performance.performance_profiles')
    );
    // 1 snapshot → computeTrend returns 'STABLE' (< 6 data points)
    expect(profileUpdate![1][5]).toBe('STABLE');
  });

  it('is idempotent: exits early if snapshot for this attempt already exists', async () => {
    const client = makeClient([
      { rows: [] },                                     // BEGIN
      { rows: [{ id: 'existing-snap' }] },              // idempotency check → found
      { rows: [] },                                     // ROLLBACK
    ]);
    mockConnect.mockResolvedValue(client);

    await handleAttemptCompleted(ATTEMPT_PAYLOAD);

    // Should have called ROLLBACK (not committed)
    const calls = (client.query as jest.Mock).mock.calls.map((c: unknown[]) => c[0] as string);
    expect(calls).toContain('ROLLBACK');
    // No INSERT INTO performance.performance_snapshots should have been called
    expect(calls.some(s => s.includes('INSERT INTO performance.performance_snapshots'))).toBe(false);
  });

  it('degrades gracefully when no assessment_report exists', async () => {
    const client = makeClient([
      { rows: [] },                                    // BEGIN
      { rows: [] },                                    // idempotency check → no match
      { rows: [] },                                    // assessment_reports → NOT FOUND
      { rows: [], rowCount: 1 },                       // INSERT performance_snapshots (null JSONB)
      { rows: [{ technical_score: null, communication_score: null, listening_score: null, overall_score: null, snap_count: '1' }] },
      { rows: [] },                                    // trend window
      { rows: [], rowCount: 1 },                       // UPDATE profiles
      { rows: [] },                                    // COMMIT
    ]);
    mockConnect.mockResolvedValue(client);

    await expect(handleAttemptCompleted(ATTEMPT_PAYLOAD)).resolves.not.toThrow();

    // No skill_performances should be inserted
    const skillInserts = (client.query as jest.Mock).mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO performance.skill_performances')
    );
    expect(skillInserts).toHaveLength(0);

    // Snapshot should still be inserted (with null JSONB)
    const snapshotInsert = (client.query as jest.Mock).mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO performance.performance_snapshots')
    );
    expect(snapshotInsert).toBeDefined();
    expect(snapshotInsert![1][9]).toBeNull();   // component_scores = null
    expect(snapshotInsert![1][10]).toBeNull();  // skill_scores = null
  });
});

// =============================================================================
// 3. Cross-student 403 enforcement for all 7 protected endpoints
// =============================================================================

describe('Cross-student authorization (403 enforcement)', () => {
  const AGENT_RUN_ID = 'run-supervisor-1';

  // Before each HTTP test, set up a basic mockQuery so student-check passes for Alice
  // but endpoint data belongs to Alice — intruder should get 403 before any DB read.
  beforeEach(() => {
    // mockQuery is reset before each test by the global beforeEach
  });

  // The assertScope / assertStudentScope functions call db.query to verify student
  // ownership. { rows: [] } means no match → 403 FORBIDDEN.
  beforeEach(() => {
    mockQuery.mockResolvedValue({ rows: [] });
  });

  describe('GET /performance/:studentId', () => {
    it('returns 200 for Alice accessing her own data', async () => {
      // Alice's scope check must pass: return a match row for her user_id
      mockQuery.mockResolvedValueOnce({ rows: [{ id: ALICE_STUDENT_ID }] })  // scope check passes
                .mockResolvedValue({ rows: [{ student_id: ALICE_STUDENT_ID, overall_score: '61.3' }] });
      const res = await request(aliceApp).get(`/performance/${ALICE_STUDENT_ID}`);
      expect(res.status).not.toBe(403);
    });

    it('returns 403 when intruder tries to access Alice\'s profile', async () => {
      // mockQuery returns { rows: [] } — no match for intruder's user_id → 403
      const res = await request(intruderApp).get(`/performance/${ALICE_STUDENT_ID}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /performance/:studentId/history', () => {
    it('returns 403 for cross-student access', async () => {
      const res = await request(intruderApp).get(`/performance/${ALICE_STUDENT_ID}/history`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /performance/:studentId/skills', () => {
    it('returns 403 for cross-student access', async () => {
      const res = await request(intruderApp).get(`/performance/${ALICE_STUDENT_ID}/skills`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /learning/plans/:studentId', () => {
    it('returns 403 for cross-student access', async () => {
      const res = await request(intruderApp).get(`/learning/plans/${ALICE_STUDENT_ID}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /learning/recommendations/:studentId', () => {
    it('returns 403 for cross-student access', async () => {
      const res = await request(intruderApp).get(`/learning/recommendations/${ALICE_STUDENT_ID}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /learning/agent/run', () => {
    it('returns 403 when intruder requests agent run for Alice', async () => {
      const res = await request(intruderApp)
        .post('/learning/agent/run')
        .send({ studentId: ALICE_STUDENT_ID, goal: 'Improve Java skills' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /learning/agent/run/:runId', () => {
    it('returns 403 when intruder reads Alice\'s agent run', async () => {
      // First DB call: load the run (returns Alice's run)
      // Second DB call: scope check for intruder → returns { rows: [] } → 403
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: AGENT_RUN_ID,
            student_id: ALICE_STUDENT_ID,
            status: 'SUCCEEDED',
            goal_snapshot: 'improve',
            termination_reason: 'NATURAL',
            correlation_id: null,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }],
        })
        .mockResolvedValue({ rows: [] });  // scope check for intruder → no match → 403
      const res = await request(intruderApp).get(`/learning/agent/run/${AGENT_RUN_ID}`);
      expect(res.status).toBe(403);
    });
  });
});

// =============================================================================
// 4. Admin bypasses student-scope checks on protected endpoints
// =============================================================================

describe('Admin role can access any student\'s data', () => {
  it('GET /performance/:studentId returns 200 for admin accessing Alice', async () => {
    // Admin bypasses scope check entirely; only the data query runs
    mockQuery.mockResolvedValue({ rows: [{ student_id: ALICE_STUDENT_ID, overall_score: '61.3', trend: 'STABLE' }] });
    const res = await request(adminApp).get(`/performance/${ALICE_STUDENT_ID}`);
    expect(res.status).toBe(200);
  });
});

// =============================================================================
// 5. recoverDeadRuns() — marks stuck RUNNING runs as DEAD
// =============================================================================

describe('recoverDeadRuns()', () => {
  it('issues the correct UPDATE to mark RUNNING→DEAD with timeout check', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await recoverDeadRuns();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = (mockQuery.mock.calls[0][0] as string);
    expect(sql).toContain("SET status             = 'DEAD'");
    expect(sql).toContain("ar.status = 'RUNNING'");
    expect(sql).toContain('PROCESS_CRASH_RECOVERY');
    expect(sql).toContain('timeout_seconds');
  });

  it('logs when stuck runs are recovered', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockQuery.mockResolvedValue({ rows: [{ id: 'run-dead-1' }, { id: 'run-dead-2' }] });

    await recoverDeadRuns();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('marked 2 stuck run(s) as DEAD'),
      expect.arrayContaining(['run-dead-1', 'run-dead-2'])
    );
    warnSpy.mockRestore();
  });

  it('does not throw when there are no stuck runs', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await expect(recoverDeadRuns()).resolves.not.toThrow();
  });
});

// =============================================================================
// 6. Listening story — audio stored via LocalStorageClient into metadata.audio_url
// =============================================================================

describe('POST /listening — audio handling', () => {
  it('stores audio via LocalStorageClient and records path in metadata.audio_url', async () => {
    mockUpload.mockResolvedValue('/uploads/listening/test-audio.mp3');
    mockQuery.mockResolvedValue({
      rows: [{
        id: '80000000-0000-0000-0000-000000000099',
        title: 'Test Story',
        content: 'Story content here.',
        difficulty: 'MEDIUM',
        source_type: 'MANUAL',
        metadata: { audio_url: '/uploads/listening/test-audio.mp3' },
        is_active: true,
      }],
    });

    const res = await request(adminApp)
      .post('/listening')
      .field('data', JSON.stringify({ title: 'Test Story', content: 'Story content here.' }))
      .attach('audio', Buffer.from('fake-audio-data'), 'test-audio.mp3');

    expect(res.status).toBe(201);
    expect(mockUpload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('listening/'),
      expect.any(String)
    );

    // DB INSERT should include audio_url in metadata JSON
    const dbCall = mockQuery.mock.calls[0];
    const metadataArg = dbCall[1][4] as string;
    expect(metadataArg).toContain('audio_url');
  });

  it('creates story successfully without audio (audio is optional)', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        id: '80000000-0000-0000-0000-000000000100',
        title: 'No Audio Story',
        content: 'Content.',
        difficulty: 'EASY',
        source_type: 'MANUAL',
        metadata: {},
        is_active: true,
      }],
    });

    const res = await request(adminApp)
      .post('/listening')
      .send({ title: 'No Audio Story', content: 'Content.', difficulty: 'EASY' });

    expect(res.status).toBe(201);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('saves story even when LocalStorageClient.upload fails (graceful degradation)', async () => {
    mockUpload.mockRejectedValue(new Error('disk full'));
    mockQuery.mockResolvedValue({
      rows: [{
        id: '80000000-0000-0000-0000-000000000101',
        title: 'Story',
        content: 'Content.',
        difficulty: 'MEDIUM',
        source_type: 'MANUAL',
        metadata: {},
        is_active: true,
      }],
    });

    const res = await request(adminApp)
      .post('/listening')
      .field('data', JSON.stringify({ title: 'Story', content: 'Content.' }))
      .attach('audio', Buffer.from('data'), 'audio.mp3');

    // Story creation succeeds even though audio storage failed
    expect(res.status).toBe(201);
  });
});

// =============================================================================
// 7. Supervisor → Specialist step delegation (step-level verification)
// =============================================================================

jest.mock('axios', () => ({ default: { post: jest.fn() }, post: jest.fn() }));

describe('Supervisor delegates to Specialist (step audit)', () => {
  it('runSpecialistAgent creates agent_run with correlation_id = supervisorRunId', async () => {
    // This verifies the DB contract: the specialist's agent_run INSERT includes
    // correlation_id = supervisorRunId, linking the two runs in agent.agent_runs.
    const supervisorRunId = 'run-supervisor-e2e-1';
    const specialistRunId = 'run-specialist-e2e-1';

    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO agent.agent_runs')) {
        return Promise.resolve({ rows: [{ id: specialistRunId }] });
      }
      if (sql.includes('UPDATE agent.agent_runs')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    // Client for the agent loop DB operations (returns empty/ok for all)
    const client = makeClient(
      Array.from({ length: 30 }, () => ({ rows: [], rowCount: 0 }))
    );
    mockConnect.mockResolvedValue(client);

    // Axios returns final_answer immediately so the loop terminates cleanly
    const axios = (await import('axios')).default;
    (axios.post as jest.Mock).mockResolvedValue({
      data: { type: 'final_answer', content: 'Done.' },
    });

    const { runSpecialistAgent } = await import('../../agents/specialistAgent');
    const SPEC_DEF = { id: 'def-spec-1', max_steps: 12, max_tool_calls: 8, timeout_seconds: 45 };

    await runSpecialistAgent(
      { studentId: ALICE_STUDENT_ID, goal: 'Improve technical interview readiness', supervisorRunId, triggeredByUserId: null },
      SPEC_DEF
    );

    // Verify the INSERT includes correlation_id = supervisorRunId
    const agentRunInsert = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO agent.agent_runs')
    );
    expect(agentRunInsert).toBeDefined();
    const insertSql   = agentRunInsert![0] as string;
    const insertParams = agentRunInsert![1] as unknown[];
    expect(insertSql).toContain('correlation_id');
    expect(insertParams).toContain(supervisorRunId);
  });
});

// =============================================================================
// 8. ATTEMPT_COMPLETED — skill_scores with null score entries are skipped
// =============================================================================

describe('ATTEMPT_COMPLETED — robustness', () => {
  it('skips skill_performances for entries where score is null', async () => {
    const reportWithNullScore = {
      component_scores: { TECHNICAL: 48.0 },
      skill_scores: {
        [SKILL_ID_1]: { score: 45.0,  proficiency_level: 'BEGINNER' },
        [SKILL_ID_2]: { score: null,   proficiency_level: null },  // should be skipped
        [SKILL_ID_3]: { score: 67.0,  proficiency_level: 'INTERMEDIATE' },
      },
    };

    const client = makeClient([
      { rows: [] },                              // BEGIN
      { rows: [] },                              // idempotency → no match
      { rows: [reportWithNullScore] },           // assessment_reports
      { rows: [], rowCount: 1 },                 // INSERT snapshots
      { rows: [], rowCount: 1 },                 // INSERT skill_perf skill 1
      // skill 2 skipped (score null)
      { rows: [], rowCount: 1 },                 // INSERT skill_perf skill 3
      { rows: [{ technical_score: null, communication_score: null, listening_score: null, overall_score: null, snap_count: '1' }] },
      { rows: [] },                              // trend
      { rows: [], rowCount: 1 },                 // UPDATE profiles
      { rows: [] },                              // COMMIT
    ]);
    mockConnect.mockResolvedValue(client);

    await handleAttemptCompleted(ATTEMPT_PAYLOAD);

    const skillInserts = (client.query as jest.Mock).mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO performance.skill_performances')
    );
    // Only 2 valid skills (skill_2 has null score, should be skipped)
    expect(skillInserts).toHaveLength(2);
    const insertedSkillIds = skillInserts.map((c: unknown[]) => (c[1] as unknown[])[1]);
    expect(insertedSkillIds).not.toContain(SKILL_ID_2);
  });
});
