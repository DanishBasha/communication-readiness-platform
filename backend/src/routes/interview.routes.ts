import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../shared/db/pool';
import { AppError } from '../shared/errors/AppError';
import { sendSuccess, sendError } from '../shared/helpers/response';
import { AuthRequest } from '../middleware/authenticate';
import { eventBus } from '../shared/events/eventBus';
import { Events, AttemptCompletedPayload } from '../shared/events/events';

export const interviewRouter = Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const startSessionSchema = z.object({
  studentId: z.string().uuid(),
  goal:      z.string().min(1).max(500).default('Improve technical skills and interview readiness'),
});

const concludeSessionSchema = z.object({
  goal:               z.string().min(1).max(500).optional(),
  overallScore:       z.number().min(0).max(100),
  technicalScore:     z.number().min(0).max(100).optional().nullable(),
  communicationScore: z.number().min(0).max(100).optional().nullable(),
  listeningScore:     z.number().min(0).max(100).optional().nullable(),
});

// ── Helper: look up student org context ──────────────────────────────────────

async function getStudentContext(studentId: string) {
  const { rows } = await db.query(
    `SELECT s.id, s.program_id, s.batch_id, s.subdivision_id
     FROM org.students s WHERE s.id = $1`,
    [studentId]
  );
  if (rows.length === 0) throw new AppError(404, 'Student not found', 'NOT_FOUND');
  return rows[0] as {
    id: string;
    program_id: string;
    batch_id: string;
    subdivision_id: string | null;
  };
}

// ── POST /api/sessions — Start an interview session ──────────────────────────
// Creates a new assessment_attempt linked to the student and returns the session ID.

interviewRouter.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = startSessionSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');
    const { studentId, goal } = parsed.data;

    const student = await getStudentContext(studentId);

    // Use the first active assessment as the template
    const { rows: assessmentRows } = await db.query(
      `SELECT id FROM assessment.assessments WHERE is_active = true ORDER BY created_at LIMIT 1`
    );
    if (assessmentRows.length === 0) {
      throw new AppError(503, 'No active assessment configuration found', 'NO_ASSESSMENT');
    }
    const assessmentId: string = assessmentRows[0].id;

    // Create attempt
    const { rows: attemptRows } = await db.query(
      `INSERT INTO assessment.assessment_attempts
         (assessment_id, student_id, interview_type, program_id, batch_id,
          subdivision_id, assessment_version, scoring_version, status, started_at)
       VALUES ($1,$2,'TECHNICAL',$3,$4,$5,1,'v1.0','IN_PROGRESS',now())
       RETURNING id`,
      [assessmentId, studentId, student.program_id, student.batch_id, student.subdivision_id]
    );
    const attemptId: string = attemptRows[0].id;

    // Create session record
    const { rows: sessionRows } = await db.query(
      `INSERT INTO session.assessment_sessions
         (attempt_id, current_sequence_no, state, last_activity_at)
       VALUES ($1, 0, 'STARTED', now())
       RETURNING id`,
      [attemptId]
    );
    const sessionId: string = sessionRows[0].id;

    console.log(
      `[interview] Session started sessionId=${sessionId} attemptId=${attemptId} ` +
      `studentId=${studentId} goal="${goal}"`
    );

    sendSuccess(res, { sessionId, attemptId, goal }, 201);
  } catch (err) {
    sendError(res, err);
  }
});

// ── POST /api/sessions/:id/conclude — Conclude session, trigger Module 3 ─────
// Marks the attempt COMPLETED, stores scores, emits ATTEMPT_COMPLETED event.
// The event handler in module3Handlers.ts updates performance data AND triggers
// the Module 3 agent, which calls Groq to generate a personalized roadmap.

interviewRouter.post('/:id/conclude', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sessionId = req.params.id;
    const parsed = concludeSessionSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR');
    const {
      goal,
      overallScore,
      technicalScore,
      communicationScore,
      listeningScore,
    } = parsed.data;

    // Load attempt via session
    const { rows: sessionRows } = await db.query(
      `SELECT ss.attempt_id
       FROM session.assessment_sessions ss
       WHERE ss.id = $1`,
      [sessionId]
    );
    if (sessionRows.length === 0) {
      throw new AppError(404, 'Session not found', 'NOT_FOUND');
    }
    const attemptId: string = sessionRows[0].attempt_id;

    // Load attempt
    const { rows: attemptRows } = await db.query(
      `SELECT student_id, program_id, batch_id, subdivision_id, status
       FROM assessment.assessment_attempts WHERE id = $1`,
      [attemptId]
    );
    if (attemptRows.length === 0) throw new AppError(404, 'Attempt not found', 'NOT_FOUND');
    const attempt = attemptRows[0];

    if (attempt.status === 'COMPLETED') {
      sendSuccess(res, { message: 'Already concluded', attemptId });
      return;
    }

    // Mark attempt complete
    await db.query(
      `UPDATE assessment.assessment_attempts
       SET status='COMPLETED', completed_at=now() WHERE id=$1`,
      [attemptId]
    );

    // Store assessment report with the provided scores
    await db.query(
      `INSERT INTO performance.assessment_reports
         (attempt_id, student_id, assessment_version, scoring_version,
          technical_score, communication_score, listening_score, overall_score,
          component_scores, skill_scores)
       VALUES ($1,$2,1,'v1.0',$3,$4,$5,$6,$7,NULL)
       ON CONFLICT (attempt_id) DO UPDATE
         SET technical_score=$3, communication_score=$4,
             listening_score=$5, overall_score=$6`,
      [
        attemptId,
        attempt.student_id,
        technicalScore ?? null,
        communicationScore ?? null,
        listeningScore ?? null,
        overallScore,
        JSON.stringify({
          TECHNICAL: technicalScore,
          COMMUNICATION: communicationScore,
          LISTENING: listeningScore,
        }),
      ]
    );

    // Update session state
    await db.query(
      `UPDATE session.assessment_sessions SET state='CONCLUDED', last_activity_at=now() WHERE id=$1`,
      [sessionId]
    );

    const resolvedGoal =
      goal ?? 'Improve technical skills, communication skills, and interview readiness';

    console.log(
      `[interview] Session concluded sessionId=${sessionId} attemptId=${attemptId} ` +
      `studentId=${attempt.student_id} overallScore=${overallScore} goal="${resolvedGoal}"`
    );

    // Emit ATTEMPT_COMPLETED — module3Handlers updates performance data
    // and triggers the Module 3 agent (Groq roadmap generation)
    const payload: AttemptCompletedPayload = {
      attemptId,
      studentId:         attempt.student_id,
      programId:         attempt.program_id,
      batchId:           attempt.batch_id,
      subdivisionId:     attempt.subdivision_id,
      overallScore,
      technicalScore:    technicalScore ?? null,
      communicationScore: communicationScore ?? null,
      listeningScore:    listeningScore ?? null,
      goal:              resolvedGoal,
    };
    eventBus.emit(Events.ATTEMPT_COMPLETED, payload);

    sendSuccess(res, { message: 'Session concluded. Module 3 agent triggered.', attemptId });
  } catch (err) {
    sendError(res, err);
  }
});
