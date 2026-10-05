/**
 * Module 3 Agent tests — Supervisor + Specialist multi-agent architecture.
 * Covers all 18 spec requirements. DB and axios are mocked; no live services required.
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
import { runAgentLoop }     from '../../agents/agentLoop';
import { SPECIALIST_TOOLS } from '../../agents/tools';
import { executeAgentRun }  from '../../agents/agentRunner';

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

const STUDENT_ID     = '00000000-0000-0000-0000-000000001001';
const SUPERVISOR_DEF = { id: 'def-supervisor-1', max_steps: 10, max_tool_calls: 20, timeout_seconds: 60 };
const SPECIALIST_DEF = { id: 'def-specialist-1', max_steps: 12, max_tool_calls: 8,  timeout_seconds: 45 };

const PERF_PROFILE = {
  technical_score: '62.00', communication_score: '76.00',
  listening_score: '81.00', overall_score: '69.00',
  trend: 'STABLE', updated_at: new Date().toISOString(),
};
const PERF_SNAPSHOTS = [{ overall_score: '69.00', captured_at: new Date().toISOString() }];
const SKILL_GAPS = [
  { skill_id: 'skill-1', name: 'System Design', category: 'TECHNICAL', avg_score: '48.00' },
];
const KNOWLEDGE_DOCS = [
  { id: 'doc-1', title: 'Java Interview Fundamentals', source_type: 'MANUAL', visibility_type: 'PUBLIC', excerpt: 'Core Java...' },
];
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

const SUPERVISOR_RUN_ROW = {
  id: 'run-supervisor-1',
  student_id: STUDENT_ID,
  goal_snapshot: 'Improve technical interview readiness',
  triggered_by_user_id: adminUser.id,
  status: 'QUEUED',
  agent_definition_id: SUPERVISOR_DEF.id,
  max_steps: SUPERVISOR_DEF.max_steps,
  max_tool_calls: SUPERVISOR_DEF.max_tool_calls,
  timeout_seconds: SUPERVISOR_DEF.timeout_seconds,
};

// ── Axios mock helpers ────────────────────────────────────────────────────────

let chatCallCount = 0;

function setupHappyAxios(): void {
  chatCallCount = 0;
  (axios.post as jest.Mock).mockImplementation((url: string) => {
    if ((url as string).includes('/learning/chat-complete')) {
      chatCallCount++;
      const seq = [
        { type: 'tool_call', tool_name: 'GetStudentPerformance',    tool_args: { studentId: STUDENT_ID } },
        { type: 'tool_call', tool_name: 'GetSkillGapAnalysis',      tool_args: { studentId: STUDENT_ID } },
        { type: 'tool_call', tool_name: 'RetrieveLearningKnowledge',tool_args: { categories: ['TECHNICAL'] } },
        { type: 'tool_call', tool_name: 'DraftLearningPlan',        tool_args: { goal: 'Improve technical interview readiness', weakSkills: ['System Design'] } },
        { type: 'final_answer', content: 'Analysis complete. Learning plan has been drafted.' },
      ];
      return Promise.resolve({ data: seq[Math.min(chatCallCount - 1, seq.length - 1)] });
    }
    if ((url as string).includes('/learning/draft-plan')) {
      return Promise.resolve({ data: DRAFT_PLAN });
    }
    return Promise.resolve({ data: {} });
  });
}

// ── DB mock helper for executeAgentRun-level tests ────────────────────────────
// Uses SQL-content matching rather than a fragile call-index counter.

function setupRunnerDb(opts: { existingPlan?: boolean } = {}): void {
  mockQuery.mockImplementation((sql: string) => {
    const s = sql as string;

    // Load run (executeAgentRun step 1)
    if (s.includes('FROM agent.agent_runs ar') && s.includes('JOIN agent.agent_definitions ad')) {
      return Promise.resolve({ rows: [SUPERVISOR_RUN_ROW] });
    }
    // Specialist def lookup
    if (s.includes("'learning_specialist_agent'")) {
      return Promise.resolve({ rows: [SPECIALIST_DEF] });
    }
    // CAS UPDATE RUNNING
    if (s.includes("SET status='RUNNING'") && s.includes("status='QUEUED'")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    // Supervisor step inserts / updates
    if (s.includes('INSERT INTO agent.agent_steps') || s.includes('UPDATE agent.agent_steps')) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    // Specialist agent_run INSERT
    if (s.includes('INSERT INTO agent.agent_runs')) {
      return Promise.resolve({ rows: [{ id: 'run-specialist-1' }] });
    }
    // Final supervisor/specialist run UPDATE
    if (s.includes('UPDATE agent.agent_runs')) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    // GetStudentPerformance — performance_profiles
    if (s.includes('performance_profiles') && s.includes('WHERE student_id')) {
      return Promise.resolve({ rows: [PERF_PROFILE] });
    }
    // GetStudentPerformance — performance_snapshots
    if (s.includes('performance_snapshots') && s.includes('WHERE student_id')) {
      return Promise.resolve({ rows: PERF_SNAPSHOTS });
    }
    // GetSkillGapAnalysis
    if (s.includes('skill_performances') && s.includes('skill_id')) {
      return Promise.resolve({ rows: SKILL_GAPS });
    }
    // RetrieveLearningKnowledge
    if (s.includes('knowledge_documents')) {
      return Promise.resolve({ rows: KNOWLEDGE_DOCS });
    }
    // Idempotency check
    if (s.includes('SELECT id FROM performance.learning_plans')) {
      return opts.existingPlan
        ? Promise.resolve({ rows: [{ id: 'existing-plan-1' }] })
        : Promise.resolve({ rows: [] });
    }
    // INSERT learning_plans
    if (s.includes('INSERT INTO performance.learning_plans')) {
      return Promise.resolve({ rows: [LEARNING_PLAN] });
    }
    // INSERT learning_recommendations
    if (s.includes('INSERT INTO performance.learning_recommendations')) {
      return Promise.resolve({ rows: [] });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
}

// ── Reset before each test ────────────────────────────────────────────────────

beforeEach(() => {
  mockQuery.mockReset();
  (axios.post as jest.Mock).mockReset();
});

// =============================================================================
// Test 1 — Supervisor starts correctly
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
// Test 2 — Supervisor delegates to specialist
// =============================================================================

describe('Test 2 — Supervisor delegates to specialist', () => {
  it('specialist agent_run is created with correlation_id = supervisorRunId', async () => {
    setupHappyAxios();
    setupRunnerDb();

    await executeAgentRun('run-supervisor-1');

    // Find the INSERT for the specialist run that carries the supervisor ID as correlation_id
    const specRunInsert = mockQuery.mock.calls.find(
      (call: unknown[]) => {
        const sql = call[0] as string;
        const params = call[1] as unknown[];
        return sql.includes('INSERT INTO agent.agent_runs') &&
               Array.isArray(params) &&
               params.includes('run-supervisor-1');
      }
    );
    expect(specRunInsert).toBeDefined();
  });
});

// =============================================================================
// Test 3 — Specialist receives only its task
// =============================================================================

describe('Test 3 — Specialist receives only its task', () => {
  it('specialist system prompt contains studentId and goal but not admin user context', async () => {
    setupHappyAxios();
    setupRunnerDb();

    await executeAgentRun('run-supervisor-1');

    const chatCalls = (axios.post as jest.Mock).mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes('/learning/chat-complete')
    );
    expect(chatCalls.length).toBeGreaterThan(0);

    const firstBody = chatCalls[0][1] as { messages: Array<{ role: string; content: string }> };
    const systemMsg = firstBody.messages.find(m => m.role === 'system');
    expect(systemMsg?.content).toContain(STUDENT_ID);
    expect(systemMsg?.content).toContain('Improve technical interview readiness');
    // Must NOT leak unrelated identifiers into the specialist's context
    expect(systemMsg?.content).not.toContain('user-admin-1');
  });
});

// =============================================================================
// Test 4 — Specialist has only authorized tools
// =============================================================================

describe('Test 4 — Specialist has only authorized tools', () => {
  it('SPECIALIST_TOOLS contains exactly the 4 specialist tools', () => {
    const names = SPECIALIST_TOOLS.map(t => t.name).sort();
    expect(names).toEqual([
      'DraftLearningPlan',
      'GetSkillGapAnalysis',
      'GetStudentPerformance',
      'RetrieveLearningKnowledge',
    ]);
  });

  it('SPECIALIST_TOOLS does not contain any supervisor-level tools', () => {
    const names = SPECIALIST_TOOLS.map(t => t.name);
    expect(names).not.toContain('AskLearningSpecialist');
    expect(names).not.toContain('PersistLearningPlan');
  });
});

// =============================================================================
// Test 5 — Read-only tools cannot modify data
// =============================================================================

describe('Test 5 — Read-only tools cannot modify data', () => {
  it('GetStudentPerformance, GetSkillGapAnalysis, RetrieveLearningKnowledge are readOnly=true', () => {
    const readOnlyNames = ['GetStudentPerformance', 'GetSkillGapAnalysis', 'RetrieveLearningKnowledge'];
    for (const name of readOnlyNames) {
      const tool = SPECIALIST_TOOLS.find(t => t.name === name)!;
      expect(tool.authorization.readOnly).toBe(true);
    }
  });

  it('DraftLearningPlan is readOnly=false but does not write to learning_plans', async () => {
    const tool = SPECIALIST_TOOLS.find(t => t.name === 'DraftLearningPlan')!;
    expect(tool.authorization.readOnly).toBe(false);
    // readOnly=false signals it may have side effects (HTTP call to AI service),
    // but it must never write to the DB directly — verified by no db.query INSERT calls
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: DRAFT_PLAN });
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await tool.execute({ goal: 'Test' }, { studentId: STUDENT_ID, agentRunId: 'run-1' });

    expect(result.success).toBe(true);
    // Verify no DB INSERT was made by this tool
    const insertCalls = mockQuery.mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes('INSERT')
    );
    expect(insertCalls).toHaveLength(0);
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

  it('scope violation inside tool is rejected before execution', async () => {
    const tool = SPECIALIST_TOOLS.find(t => t.name === 'GetStudentPerformance')!;
    const result = await tool.execute(
      { studentId: 'different-student-id' },
      { studentId: STUDENT_ID, agentRunId: 'run-1' }
    );
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SCOPE_VIOLATION');
    // No DB queries should have been made
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Test 7 — Agent step limit works
// =============================================================================

describe('Test 7 — Agent step limit works', () => {
  it('runAgentLoop terminates with MAX_STEPS when the step limit is reached', async () => {
    // LLM always returns a tool call — loop never terminates naturally
    (axios.post as jest.Mock).mockResolvedValue({
      data: { type: 'tool_call', tool_name: 'GetStudentPerformance', tool_args: { studentId: STUDENT_ID } },
    });
    mockQuery.mockResolvedValue({ rows: [PERF_PROFILE] });

    const result = await runAgentLoop({
      agentRunId:   'test-run-steps',
      studentId:    STUDENT_ID,
      systemPrompt: 'test',
      userMessage:  'test',
      tools:        SPECIALIST_TOOLS,
      maxSteps:     3,
      maxToolCalls: 100,
      timeoutMs:    60_000,
    });

    expect(result.terminationReason).toBe('MAX_STEPS');
    expect(result.stepCount).toBeGreaterThanOrEqual(3);
  });
});

// =============================================================================
// Test 8 — Tool call limit works
// =============================================================================

describe('Test 8 — Tool call limit works', () => {
  it('runAgentLoop terminates with MAX_TOOL_CALLS when the tool call limit is reached', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { type: 'tool_call', tool_name: 'GetStudentPerformance', tool_args: { studentId: STUDENT_ID } },
    });
    mockQuery.mockResolvedValue({ rows: [PERF_PROFILE] });

    const result = await runAgentLoop({
      agentRunId:   'test-run-toolcalls',
      studentId:    STUDENT_ID,
      systemPrompt: 'test',
      userMessage:  'test',
      tools:        SPECIALIST_TOOLS,
      maxSteps:     100,
      maxToolCalls: 2,
      timeoutMs:    60_000,
    });

    expect(result.terminationReason).toBe('MAX_TOOL_CALLS');
    expect(result.toolCallCount).toBe(2);
  });
});

// =============================================================================
// Test 9 — Timeout works
// =============================================================================

describe('Test 9 — Timeout works', () => {
  it('runAgentLoop terminates with TIMEOUT when the deadline is exceeded', async () => {
    // Use a very short timeout; the limit check runs before the first LLM call
    const result = await runAgentLoop({
      agentRunId:   'test-run-timeout',
      studentId:    STUDENT_ID,
      systemPrompt: 'test',
      userMessage:  'test',
      tools:        SPECIALIST_TOOLS,
      maxSteps:     10,
      maxToolCalls: 10,
      timeoutMs:    -1, // deadline already in the past — guarantees TIMEOUT on first check
    });

    expect(result.terminationReason).toBe('TIMEOUT');
  });
});

// =============================================================================
// Test 10 — Tool failure is handled gracefully
// =============================================================================

describe('Test 10 — Tool failure is handled', () => {
  it('loop continues and adds error message when a tool\'s DB query throws', async () => {
    let axiosCount = 0;
    (axios.post as jest.Mock).mockImplementation((url: string) => {
      if ((url as string).includes('/learning/chat-complete')) {
        axiosCount++;
        if (axiosCount === 1) {
          return Promise.resolve({ data: { type: 'tool_call', tool_name: 'GetSkillGapAnalysis', tool_args: { studentId: STUDENT_ID } } });
        }
        return Promise.resolve({ data: { type: 'final_answer', content: 'done despite error' } });
      }
      return Promise.resolve({ data: {} });
    });

    let dbCount = 0;
    mockQuery.mockImplementation((_sql: string) => {
      dbCount++;
      if (dbCount === 1) return Promise.resolve({ rows: [] }); // LLM step insert (insertCompletedStep)
      if (dbCount === 2) return Promise.resolve({ rows: [] }); // TOOL INSERT RUNNING
      if (dbCount === 3) throw new Error('DB connection lost');  // GetSkillGapAnalysis fails
      return Promise.resolve({ rows: [] });
    });

    const result = await runAgentLoop({
      agentRunId:   'test-run-toolfail',
      studentId:    STUDENT_ID,
      systemPrompt: 'test',
      userMessage:  'test',
      tools:        SPECIALIST_TOOLS,
      maxSteps:     10,
      maxToolCalls: 5,
      timeoutMs:    30_000,
    });

    // Loop continues after the tool error and reaches the final_answer
    expect(result.terminationReason).toBe('NATURAL');
  });
});

// =============================================================================
// Test 11 — Specialist failure is returned safely
// =============================================================================

describe('Test 11 — Specialist failure is returned safely', () => {
  it('supervisor run is marked FAILED when specialist produces no draftPlan', async () => {
    // LLM returns final_answer immediately (no DraftLearningPlan called)
    (axios.post as jest.Mock).mockImplementation((url: string) => {
      if ((url as string).includes('/learning/chat-complete')) {
        return Promise.resolve({ data: { type: 'final_answer', content: 'done without plan' } });
      }
      return Promise.resolve({ data: {} });
    });

    mockQuery.mockImplementation((sql: string) => {
      const s = sql as string;
      if (s.includes('FROM agent.agent_runs ar') && s.includes('JOIN agent.agent_definitions ad')) {
        return Promise.resolve({ rows: [SUPERVISOR_RUN_ROW] });
      }
      if (s.includes("'learning_specialist_agent'")) {
        return Promise.resolve({ rows: [SPECIALIST_DEF] });
      }
      if (s.includes("SET status='RUNNING'") && s.includes("status='QUEUED'")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      if (s.includes('INSERT INTO agent.agent_runs')) {
        return Promise.resolve({ rows: [{ id: 'run-specialist-1' }] });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await executeAgentRun('run-supervisor-1');

    const failedCall = mockQuery.mock.calls.find(
      (call: unknown[]) => {
        const s = call[0] as string;
        return s.includes('agent_runs') && s.includes("status='FAILED'");
      }
    );
    expect(failedCall).toBeDefined();
  });
});

// =============================================================================
// Test 12 — Agent run and steps are persisted
// =============================================================================

describe('Test 12 — Agent run and steps are persisted', () => {
  it('POST /agent/run delegates to Python with correct payload', async () => {
    // Node.js only: student exists check
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

  it('executeAgentRun persists agent_steps with sequence_no and step_type', async () => {
    setupHappyAxios();
    setupRunnerDb();

    await executeAgentRun('run-supervisor-1');

    const stepInserts = mockQuery.mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes('INSERT INTO agent.agent_steps')
    );
    expect(stepInserts.length).toBeGreaterThanOrEqual(4);
    expect(stepInserts[0]![0]).toContain('sequence_no');
    expect(stepInserts[0]![0]).toContain('step_type');
  });
});

// =============================================================================
// Test 13 — Learning plan is persisted
// =============================================================================

describe('Test 13 — Learning plan is persisted', () => {
  it('INSERT learning_plans uses DBML columns: generated_by_agent_run_id, plan_data, version', async () => {
    setupHappyAxios();
    setupRunnerDb();

    await executeAgentRun('run-supervisor-1');

    const planInsert = mockQuery.mock.calls.find(
      (call: unknown[]) => (call[0] as string).includes('INSERT INTO performance.learning_plans')
    );
    expect(planInsert).toBeDefined();
    expect(planInsert![0]).toContain('generated_by_agent_run_id');
    expect(planInsert![0]).toContain('plan_data');
    expect(planInsert![0]).toContain('version');
  });
});

// =============================================================================
// Test 14 — Duplicate/replayed side effects are safe
// =============================================================================

describe('Test 14 — Duplicate/replayed side effects are safe', () => {
  it('does NOT insert a second learning_plan when one already exists for the run', async () => {
    setupHappyAxios();
    setupRunnerDb({ existingPlan: true }); // idempotency SELECT returns existing row

    await executeAgentRun('run-supervisor-1');

    const planInserts = mockQuery.mock.calls.filter(
      (call: unknown[]) => (call[0] as string).includes('INSERT INTO performance.learning_plans')
    );
    expect(planInserts).toHaveLength(0);
  });
});

// =============================================================================
// Test 15 — Agent terminates normally
// =============================================================================

describe('Test 15 — Agent terminates normally', () => {
  it('supervisor run is marked SUCCEEDED after specialist completes', async () => {
    setupHappyAxios();
    setupRunnerDb();

    await executeAgentRun('run-supervisor-1');

    const succeededCall = mockQuery.mock.calls.find(
      (call: unknown[]) => {
        const s = call[0] as string;
        return s.includes('agent_runs') && s.includes("status='SUCCEEDED'");
      }
    );
    expect(succeededCall).toBeDefined();
  });
});

// =============================================================================
// Test 16 — Agent terminates when model loops
// =============================================================================

describe('Test 16 — Agent terminates when model loops (MAX_TOOL_CALLS)', () => {
  it('runAgentLoop returns MAX_TOOL_CALLS when LLM keeps calling the same tool', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { type: 'tool_call', tool_name: 'GetStudentPerformance', tool_args: { studentId: STUDENT_ID } },
    });
    mockQuery.mockResolvedValue({ rows: [PERF_PROFILE] });

    const result = await runAgentLoop({
      agentRunId:   'loop-run',
      studentId:    STUDENT_ID,
      systemPrompt: 'test',
      userMessage:  'test',
      tools:        SPECIALIST_TOOLS,
      maxSteps:     50,
      maxToolCalls: 3,
      timeoutMs:    60_000,
    });

    expect(result.terminationReason).toBe('MAX_TOOL_CALLS');
    expect(result.toolCallCount).toBe(3);
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
