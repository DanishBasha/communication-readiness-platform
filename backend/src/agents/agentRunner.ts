import { db } from '../shared/db/pool';

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
