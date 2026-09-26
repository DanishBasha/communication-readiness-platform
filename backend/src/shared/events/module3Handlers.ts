import { PoolClient } from 'pg';
import { db } from '../db/pool';
import { eventBus } from './eventBus';
import { Events, UserRegisteredPayload, AttemptCompletedPayload } from './events';

export function registerModule3Handlers(): void {
  eventBus.on(Events.USER_REGISTERED, handleUserRegistered);
  eventBus.on(Events.ATTEMPT_COMPLETED, handleAttemptCompleted);
}

// ── USER_REGISTERED ────────────────────────────────────────────────────────────
// Only STUDENT registrations get a performance profile.
// Idempotent via UNIQUE(student_id) + ON CONFLICT DO NOTHING.

export async function handleUserRegistered(payload: UserRegisteredPayload): Promise<void> {
  if (!payload.studentId) return;

  try {
    await db.query(
      `INSERT INTO performance.performance_profiles (student_id)
       VALUES ($1)
       ON CONFLICT (student_id) DO NOTHING`,
      [payload.studentId]
    );
  } catch (err) {
    console.error('[module3] USER_REGISTERED error:', err);
  }
}

// Row shape returned by assessment_reports query
interface AssessmentReportRow {
  component_scores: Record<string, unknown> | null;
  skill_scores: Record<string, { score: number; proficiency_level?: string }> | null;
}

// ── ATTEMPT_COMPLETED ─────────────────────────────────────────────────────────
// 1. Look up assessment_report to get per-skill breakdown (Module 2 creates this
//    before firing the event; if absent we degrade gracefully).
// 2. Insert immutable performance_snapshot with component/skill JSONB populated.
// 3. Insert one skill_performances row per skill found in assessment_report.
// 4. Recalculate running average on performance_profiles.
// 5. Recalculate trend (last 3 vs previous 3 snapshots).
// Idempotent: exits early if snapshot for this attempt already exists.

export async function handleAttemptCompleted(payload: AttemptCompletedPayload): Promise<void> {
  const {
    attemptId, studentId, programId, batchId, subdivisionId,
    overallScore, technicalScore, communicationScore, listeningScore,
  } = payload;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // ── Idempotency: skip if snapshot for this attempt already exists ──────────
    const { rows: existing } = await client.query(
      `SELECT id FROM performance.performance_snapshots
       WHERE student_id = $1 AND attempt_id = $2`,
      [studentId, attemptId]
    );
    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return;
    }

    // ── Read assessment_report for per-skill data (Module 2 prerequisite) ──────
    // If Module 2 hasn't created the report yet the handler degrades gracefully:
    // snapshot is inserted with null skill_scores, and skill_performances are skipped.
    const { rows: reportRows } = await client.query<AssessmentReportRow>(
      `SELECT component_scores, skill_scores
       FROM performance.assessment_reports
       WHERE attempt_id = $1`,
      [attemptId]
    );
    const report = reportRows[0] ?? null;

    // ── Insert immutable snapshot ─────────────────────────────────────────────
    await client.query(
      `INSERT INTO performance.performance_snapshots
         (student_id, attempt_id, program_id, batch_id, subdivision_id,
          technical_score, communication_score, listening_score, overall_score,
          component_scores, skill_scores)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        studentId, attemptId, programId, batchId, subdivisionId ?? null,
        technicalScore ?? null, communicationScore ?? null, listeningScore ?? null,
        overallScore,
        report?.component_scores ? JSON.stringify(report.component_scores) : null,
        report?.skill_scores     ? JSON.stringify(report.skill_scores)     : null,
      ]
    );

    // ── Insert skill_performances from assessment_report.skill_scores ─────────
    // Each entry is { [skill_id]: { score, proficiency_level? } }
    if (report?.skill_scores) {
      for (const [skillId, data] of Object.entries(report.skill_scores)) {
        if (data?.score == null) continue;
        await client.query(
          `INSERT INTO performance.skill_performances
             (student_id, skill_id, attempt_id, score, proficiency_level, source)
           VALUES ($1,$2,$3,$4,$5,'ASSESSMENT')`,
          [
            studentId,
            skillId,
            attemptId,
            data.score,
            data.proficiency_level ?? null,
          ]
        );
      }
    }

    // ── Fetch current profile + snapshot count ────────────────────────────────
    const { rows: profileRows } = await client.query(
      `SELECT technical_score, communication_score, listening_score, overall_score,
              (SELECT COUNT(*) FROM performance.performance_snapshots WHERE student_id = $1) AS snap_count
       FROM performance.performance_profiles WHERE student_id = $1`,
      [studentId]
    );

    if (profileRows.length === 0) {
      // Profile not yet created (USER_REGISTERED may not have fired yet) — create it
      await client.query(
        `INSERT INTO performance.performance_profiles
           (student_id, technical_score, communication_score, listening_score, overall_score,
            previous_overall_score, trend)
         VALUES ($1,$2,$3,$4,$5, NULL, 'STABLE')
         ON CONFLICT (student_id) DO NOTHING`,
        [studentId, technicalScore ?? null, communicationScore ?? null, listeningScore ?? null, overallScore]
      );
      await client.query('COMMIT');
      return;
    }

    const prof = profileRows[0];
    const n = parseInt(prof.snap_count as string, 10); // includes the snapshot just inserted

    // Running average: new_avg = (old_avg × (n−1) + new_score) / n
    const avg = (old: string | null, newVal: number | null): number | null => {
      if (newVal == null) return old != null ? parseFloat(old) : null;
      if (old == null)   return newVal;
      return (parseFloat(old) * (n - 1) + newVal) / n;
    };

    const newOverall       = avg(prof.overall_score as string | null,       overallScore) ?? overallScore;
    const newTechnical     = avg(prof.technical_score as string | null,     technicalScore ?? null);
    const newCommunication = avg(prof.communication_score as string | null, communicationScore ?? null);
    const newListening     = avg(prof.listening_score as string | null,     listeningScore ?? null);

    // Trend: avg(last 3 overall) vs avg(previous 3 overall)
    const trend = await fetchTrend(client, studentId);

    await client.query(
      `UPDATE performance.performance_profiles
       SET technical_score        = $2,
           communication_score    = $3,
           listening_score        = $4,
           previous_overall_score = overall_score,
           overall_score          = $5,
           trend                  = $6,
           updated_at             = now()
       WHERE student_id = $1`,
      [studentId, newTechnical, newCommunication, newListening, newOverall, trend]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[module3] ATTEMPT_COMPLETED error:', err);
  } finally {
    client.release();
  }
}

// Pure function — exported for unit testing.
// scores: newest-first. Requires at least 6 values (two full windows of 3) to
// produce IMPROVING/DECLINING; anything less returns STABLE.
export function computeTrend(scores: number[]): string {
  if (scores.length < 6) return 'STABLE';
  const recent3 = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const prev3   = scores.slice(3, 6).reduce((a, b) => a + b, 0) / 3;
  const diff    = recent3 - prev3;
  if (diff > 5)  return 'IMPROVING';
  if (diff < -5) return 'DECLINING';
  return 'STABLE';
}

async function fetchTrend(
  client: PoolClient,
  studentId: string
): Promise<string> {
  const { rows } = await client.query<{ overall_score: string }>(
    `SELECT overall_score FROM performance.performance_snapshots
     WHERE student_id = $1 ORDER BY captured_at DESC LIMIT 6`,
    [studentId]
  );
  return computeTrend(rows.map(r => parseFloat(r.overall_score)));
}
