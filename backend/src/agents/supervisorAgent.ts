import { db } from '../shared/db/pool';
import { getStudentPerformanceTool } from './tools';
import { runSpecialistAgent, SpecialistResult } from './specialistAgent';

// ── Public types ──────────────────────────────────────────────────────────────

export interface SupervisorInput {
  supervisorRunId: string;
  studentId: string;
  goal: string;
  triggeredByUserId: string | null;
  specDef: {
    id: string;
    max_steps: number;
    max_tool_calls: number;
    timeout_seconds: number;
  };
}

export interface SupervisorResult {
  learningPlan: Record<string, unknown>;
  specialistResult: SpecialistResult;
}

// ── Supervisor agent ──────────────────────────────────────────────────────────

export async function runSupervisorAgent(
  input: SupervisorInput
): Promise<SupervisorResult> {
  const { supervisorRunId, studentId, goal, triggeredByUserId, specDef } = input;

  // ── Step 1 (DECISION): Supervisor starts, will gather basic context ───────
  await insertStep(
    supervisorRunId, 1, 'DECISION', null,
    { goal },
    { decision: 'START' },
    'COMPLETED', null, null, 0
  );

  // ── Step 2 (TOOL): GetStudentPerformance — direct call, no LLM loop ───────
  // Supervisor has read access to performance data for routing context only.
  await db.query(
    `INSERT INTO agent.agent_steps
       (agent_run_id, sequence_no, step_type, tool_name, input, status)
     VALUES ($1,2,'TOOL','GetStudentPerformance',$2,'RUNNING')`,
    [supervisorRunId, JSON.stringify({ studentId })]
  );

  const perfStart = Date.now();
  const perfCtx   = { studentId, agentRunId: supervisorRunId };
  const perfResult = await getStudentPerformanceTool.execute({ studentId }, perfCtx);
  const perfMs    = Date.now() - perfStart;

  await db.query(
    `UPDATE agent.agent_steps
     SET output=$2, status=$3, duration_ms=$4
     WHERE agent_run_id=$1 AND sequence_no=2`,
    [
      supervisorRunId,
      JSON.stringify(perfResult.data ?? null),
      perfResult.success ? 'COMPLETED' : 'FAILED',
      perfMs,
    ]
  );

  // ── Step 3 (DECISION): Delegate to specialist ─────────────────────────────
  await insertStep(
    supervisorRunId, 3, 'DECISION', null,
    { decision: 'DELEGATE_TO_SPECIALIST' },
    { reason: 'learning plan requires specialist analysis' },
    'COMPLETED', null, null, 0
  );

  const specialist = await runSpecialistAgent(
    { studentId, goal, supervisorRunId, triggeredByUserId },
    specDef
  );

  if (!specialist.draftPlan) {
    throw new Error('Specialist failed to produce a learning plan');
  }

  // ── Step 4 (DECISION): Validate and persist plan ──────────────────────────
  await insertStep(
    supervisorRunId, 4, 'DECISION', null,
    { decision: 'PERSIST_PLAN' },
    { specialistRunId: specialist.specialistRunId },
    'COMPLETED', null, null, 0
  );

  // ── Idempotency guard: do not create a duplicate plan ────────────────────
  const { rows: existing } = await db.query(
    `SELECT id FROM performance.learning_plans WHERE generated_by_agent_run_id = $1`,
    [supervisorRunId]
  );

  let learningPlan: Record<string, unknown>;

  if (existing.length > 0) {
    learningPlan = existing[0] as Record<string, unknown>;
  } else {
    const { rows: planRows } = await db.query(
      `INSERT INTO performance.learning_plans
         (student_id, generated_by_agent_run_id, goal, plan_data, status, version)
       VALUES ($1,$2,$3,$4,'ACTIVE',1)
       RETURNING *`,
      [studentId, supervisorRunId, goal, JSON.stringify(specialist.draftPlan)]
    );
    learningPlan = planRows[0] as Record<string, unknown>;

    for (const ws of specialist.weakSkills) {
      await db.query(
        `INSERT INTO performance.learning_recommendations
           (student_id, learning_plan_id, skill_id, recommendation_type,
            title, description, priority, status)
         VALUES ($1,$2,$3,'SKILL_GAP',$4,
                 'Focus on this skill based on performance gap',1,'ACTIVE')`,
        [studentId, learningPlan.id, ws.skill_id, `Improve: ${ws.name}`]
      );
    }
  }

  return { learningPlan, specialistResult: specialist };
}

// ── Local step persistence helper ─────────────────────────────────────────────

async function insertStep(
  runId: string,
  seqNo: number,
  stepType: string,
  toolName: string | null,
  input: unknown,
  output: unknown,
  status: string,
  errorCode: string | null,
  errorMessage: string | null,
  durationMs: number
): Promise<void> {
  await db.query(
    `INSERT INTO agent.agent_steps
       (agent_run_id, sequence_no, step_type, tool_name, input, output,
        status, error_code, error_message, duration_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (agent_run_id, sequence_no) DO NOTHING`,
    [
      runId, seqNo, stepType, toolName,
      JSON.stringify(input ?? null),
      output !== null ? JSON.stringify(output) : null,
      status, errorCode, errorMessage, durationMs,
    ]
  );
}
