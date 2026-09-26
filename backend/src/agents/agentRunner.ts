import { db } from '../shared/db/pool';
import { runSupervisorAgent } from './supervisorAgent';

/**
 * Recover agent runs that were left in RUNNING state when the process previously crashed.
 * Called once at startup. Marks each stuck run as DEAD so operators can inspect them
 * and new runs can be enqueued without confusion.
 *
 * A run is "stuck" when:
 *   status = 'RUNNING'  AND  started_at < now() - timeout_seconds interval
 *
 * 'DEAD' is used (not 'FAILED') to distinguish crash-recovery from normal failure,
 * matching the Day 3 durable execution status vocabulary.
 */
export async function recoverDeadRuns(): Promise<void> {
  const { rows } = await db.query<{ id: string }>(
    `UPDATE agent.agent_runs ar
     SET status             = 'DEAD',
         termination_reason = 'PROCESS_CRASH_RECOVERY',
         completed_at       = now()
     FROM agent.agent_definitions ad
     WHERE ar.agent_definition_id = ad.id
       AND ar.status = 'RUNNING'
       AND ar.started_at < now() - (ad.timeout_seconds * INTERVAL '1 second')
     RETURNING ar.id`
  );
  if (rows.length > 0) {
    console.warn(
      `[agentRunner] recoverDeadRuns: marked ${rows.length} stuck run(s) as DEAD`,
      rows.map(r => r.id)
    );
  }
}

export async function executeAgentRun(runId: string): Promise<void> {
  // Load the run joined with its supervisor agent definition
  const { rows: runRows } = await db.query(
    `SELECT ar.id, ar.student_id, ar.goal_snapshot, ar.triggered_by_user_id,
            ar.status, ar.agent_definition_id,
            ad.max_steps, ad.max_tool_calls, ad.timeout_seconds
     FROM agent.agent_runs ar
     JOIN agent.agent_definitions ad ON ad.id = ar.agent_definition_id
     WHERE ar.id = $1`,
    [runId]
  );

  if (runRows.length === 0) return;  // run not found — nothing to do
  const run = runRows[0];

  // Idempotency: only execute QUEUED runs
  if (run.status !== 'QUEUED') return;

  // Load the specialist agent definition
  const { rows: specRows } = await db.query(
    `SELECT id, max_steps, max_tool_calls, timeout_seconds
     FROM agent.agent_definitions
     WHERE name = 'learning_specialist_agent' AND is_active = true
     ORDER BY version DESC LIMIT 1`
  );

  if (specRows.length === 0) {
    await db.query(
      `UPDATE agent.agent_runs
       SET status='FAILED', termination_reason='SPECIALIST_DEF_NOT_FOUND', completed_at=now()
       WHERE id=$1`,
      [runId]
    );
    return;
  }

  // CAS update — prevents double-execution if two workers race
  const { rowCount } = await db.query(
    `UPDATE agent.agent_runs
     SET status='RUNNING', started_at=now()
     WHERE id=$1 AND status='QUEUED'`,
    [runId]
  );

  if ((rowCount ?? 0) === 0) return;  // another worker already took it

  try {
    await runSupervisorAgent({
      supervisorRunId:   runId,
      studentId:         run.student_id,
      goal:              run.goal_snapshot,
      triggeredByUserId: run.triggered_by_user_id,
      specDef:           specRows[0],
    });

    await db.query(
      `UPDATE agent.agent_runs
       SET status='SUCCEEDED', termination_reason='LearningPlanPersisted', completed_at=now()
       WHERE id=$1`,
      [runId]
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error';
    await db.query(
      `UPDATE agent.agent_runs
       SET status='FAILED', termination_reason=$2, completed_at=now()
       WHERE id=$1`,
      [runId, reason.slice(0, 500)]
    );
  }
}
