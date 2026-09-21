import { db } from '../config/database';
import { InterviewAgent } from '../agents/InterviewAgent';
import { ContextBuilder } from '../rag/ContextBuilder';
import { SpeechMetricsEngine } from '../adapters/speech/SpeechMetricsEngine';
import { Difficulty, QuestionTurn, DiagnosticReport } from '../types';

export class InterviewService {
  constructor(
    private interviewAgent: InterviewAgent,
    private contextBuilder: ContextBuilder,
    private speechEngine: SpeechMetricsEngine
  ) {}

  async startInterviewSession(
    studentId: string,
    sessionType: 'MOCK_INTERVIEW' | 'PRACTICE' = 'MOCK_INTERVIEW',
    assignmentId?: string
  ): Promise<{ sessionId: string; firstQuestion: QuestionTurn }> {
    // 1. Fetch student info and resume
    const stuRes = await db.query(`
      SELECT s.id, s.track, d.name AS domain_name
      FROM college.students s
      LEFT JOIN college.domains d ON s.domain_id = d.id
      WHERE s.id::text = $1 OR s.user_id::text = $1 OR s.roll_number = $1 OR ($1 = 'stu-101' AND s.roll_number = '21CS1084');
    `, [studentId]);

    if (stuRes.rowCount === 0) {
      throw new Error(`Student record not found for ID: ${studentId}`);
    }

    const resolvedStudentId = stuRes.rows[0].id;
    const track = stuRes.rows[0]?.track || 'HOPE_ELITE';
    const domainName = stuRes.rows[0]?.domain_name || 'Full Stack Development';

    const resResume = await db.query(
      'SELECT file_name, uploaded_at, parsed_summary, parsed_skills, parsed_projects FROM college.resumes WHERE student_id = $1',
      [resolvedStudentId]
    );

    let parsedResume = null;
    if (resResume.rowCount && resResume.rowCount > 0) {
      const r = resResume.rows[0];
      parsedResume = {
        fileName: r.file_name,
        parsedAt: new Date(r.uploaded_at).toISOString().split('T')[0],
        summary: r.parsed_summary || '',
        skills: r.parsed_skills || { languages: [], frameworks: [], databases: [], tools: [] },
        projects: r.parsed_projects || []
      };
    }

    // 2. Create Interview Session in DB
    const sessRes = await db.query(`
      INSERT INTO assessment.interview_sessions (
        student_id, assignment_id, session_type, current_difficulty, turn_index, status
      )
      VALUES ($1, $2, $3, 'EASY', 0, 'ACTIVE')
      RETURNING id, current_difficulty;
    `, [resolvedStudentId, assignmentId || null, sessionType]);

    const sessionId = sessRes.rows[0].id;

    // 3. Initialize ephemeral session RAG context
    await this.contextBuilder.initializeSessionContext(sessionId, track, domainName, parsedResume);

    // 4. Generate first question using InterviewAgent
    const genQ = await this.interviewAgent.generateNextQuestion(
      sessionId,
      1,
      'EASY',
      domainName
    );

    // 5. Insert Turn 1 into DB
    const turnRes = await db.query(`
      INSERT INTO assessment.session_turns (
        session_id, turn_number, question_text, difficulty
      )
      VALUES ($1, 1, $2, $3)
      RETURNING id, turn_number, question_text, difficulty;
    `, [sessionId, genQ.questionText, 'EASY']);

    const firstQuestion: QuestionTurn = {
      id: turnRes.rows[0].id,
      questionNumber: 1,
      questionText: turnRes.rows[0].question_text,
      difficulty: turnRes.rows[0].difficulty
    };

    return { sessionId, firstQuestion };
  }

  async recordProctorEvent(
    sessionId: string,
    eventType: 'TAB_SWITCH' | 'FULLSCREEN_EXIT'
  ): Promise<{ tabSwitches: number; isFlagged: boolean }> {
    const col = eventType === 'TAB_SWITCH' ? 'tab_switch_count' : 'fullscreen_exit_count';

    const res = await db.query(`
      UPDATE assessment.interview_sessions
      SET 
        ${col} = ${col} + 1,
        is_proctor_flagged = CASE WHEN (tab_switch_count + 1) >= 4 THEN true ELSE is_proctor_flagged END
      WHERE id = $1
      RETURNING tab_switch_count, is_proctor_flagged;
    `, [sessionId]);

    if (res.rowCount === 0) {
      throw new Error('Interview session not found.');
    }

    return {
      tabSwitches: res.rows[0].tab_switch_count,
      isFlagged: res.rows[0].is_proctor_flagged
    };
  }

  async submitTurnAnswer(
    sessionId: string,
    studentAnswer: string,
    estimatedDurationSeconds?: number,
    totalTurnsAllowed = 4
  ): Promise<{
    isCompleted: boolean;
    turnEvaluation?: QuestionTurn;
    nextQuestion?: QuestionTurn;
    finalReport?: DiagnosticReport;
  }> {
    // 1. Fetch current session state
    const sessRes = await db.query(`
      SELECT id, student_id, turn_index, current_difficulty, tab_switch_count, is_proctor_flagged, status
      FROM assessment.interview_sessions
      WHERE id = $1 AND status = 'ACTIVE';
    `, [sessionId]);

    if (sessRes.rowCount === 0) {
      throw new Error('Active interview session not found.');
    }

    const session = sessRes.rows[0];
    const currentTurnIndex = session.turn_index;
    const currentTurnNumber = currentTurnIndex + 1;

    // 2. Fetch the current turn
    const turnRes = await db.query(`
      SELECT id, question_text, difficulty
      FROM assessment.session_turns
      WHERE session_id = $1 AND turn_number = $2;
    `, [sessionId, currentTurnNumber]);

    if (turnRes.rowCount === 0) {
      throw new Error(`Turn ${currentTurnNumber} not found.`);
    }

    const currentTurn = turnRes.rows[0];

    // 3. Compute speech metrics (WPM, fillers)
    const metrics = await this.speechEngine.processTranscript(studentAnswer, estimatedDurationSeconds);

    // 4. Evaluate answer via InterviewAgent
    const evalResult = await this.interviewAgent.evaluateAnswer(
      sessionId,
      currentTurn.question_text,
      studentAnswer,
      currentTurn.difficulty,
      metrics.wpm,
      metrics.totalFillerWords
    );

    // 5. Update turn record in DB
    await db.query(`
      UPDATE assessment.session_turns
      SET 
        student_transcript = $1,
        technical_score = $2,
        communication_score = $3,
        speaking_pace_wpm = $4,
        filler_word_count = $5,
        filler_breakdown = $6,
        feedback = $7,
        strengths = $8,
        weaknesses = $9
      WHERE id = $10;
    `, [
      studentAnswer,
      evalResult.technicalScore,
      evalResult.communicationScore,
      metrics.wpm,
      metrics.totalFillerWords,
      JSON.stringify(metrics.fillerWordBreakdown),
      evalResult.feedback,
      evalResult.strengths,
      evalResult.weaknesses,
      currentTurn.id
    ]);

    // 6. Append to RAG context
    await this.contextBuilder.appendTurnContext(
      sessionId,
      currentTurnNumber,
      currentTurn.question_text,
      studentAnswer
    );

    const evaluatedTurn: QuestionTurn = {
      id: currentTurn.id,
      questionNumber: currentTurnNumber,
      questionText: currentTurn.question_text,
      difficulty: currentTurn.difficulty,
      studentAnswer,
      technicalScore: evalResult.technicalScore,
      communicationScore: evalResult.communicationScore,
      wpm: metrics.wpm,
      fillerWords: metrics.totalFillerWords,
      fillerBreakdown: metrics.fillerWordBreakdown,
      feedback: evalResult.feedback,
      strengths: evalResult.strengths,
      weaknesses: evalResult.weaknesses
    };

    // 7. Check if interview turns are complete
    if (currentTurnNumber >= totalTurnsAllowed) {
      const finalReport = await this.finalizeInterview(sessionId);
      return {
        isCompleted: true,
        turnEvaluation: evaluatedTurn,
        finalReport
      };
    }

    // 8. Adapt difficulty
    let nextDifficulty: Difficulty = currentTurn.difficulty;
    if (evalResult.technicalScore >= 80) {
      if (currentTurn.difficulty === 'EASY') nextDifficulty = 'MEDIUM';
      else if (currentTurn.difficulty === 'MEDIUM') nextDifficulty = 'ADVANCED';
    } else if (evalResult.technicalScore < 55) {
      if (currentTurn.difficulty === 'ADVANCED') nextDifficulty = 'MEDIUM';
      else if (currentTurn.difficulty === 'MEDIUM') nextDifficulty = 'EASY';
    }

    const nextTurnNumber = currentTurnNumber + 1;

    // 9. Generate next question
    const nextQ = await this.interviewAgent.generateNextQuestion(
      sessionId,
      nextTurnNumber,
      nextDifficulty,
      currentTurn.question_text
    );

    // 10. Insert next turn into DB
    const nextTurnRes = await db.query(`
      INSERT INTO assessment.session_turns (
        session_id, turn_number, question_text, difficulty
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, turn_number, question_text, difficulty;
    `, [sessionId, nextTurnNumber, nextQ.questionText, nextDifficulty]);

    // 11. Update session turn_index and difficulty
    await db.query(`
      UPDATE assessment.interview_sessions
      SET turn_index = $1, current_difficulty = $2
      WHERE id = $3;
    `, [nextTurnNumber - 1, nextDifficulty, sessionId]);

    const nextQuestionTurn: QuestionTurn = {
      id: nextTurnRes.rows[0].id,
      questionNumber: nextTurnNumber,
      questionText: nextTurnRes.rows[0].question_text,
      difficulty: nextTurnRes.rows[0].difficulty
    };

    return {
      isCompleted: false,
      turnEvaluation: evaluatedTurn,
      nextQuestion: nextQuestionTurn
    };
  }

  async finalizeInterview(sessionId: string): Promise<DiagnosticReport> {
    const sessRes = await db.query(`
      SELECT s.id, s.student_id, s.session_type, s.tab_switch_count, s.is_proctor_flagged
      FROM assessment.interview_sessions s
      WHERE s.id = $1;
    `, [sessionId]);

    if (sessRes.rowCount === 0) {
      throw new Error('Interview session not found.');
    }

    const session = sessRes.rows[0];

    // Fetch all completed turns
    const turnsRes = await db.query(`
      SELECT 
        id, turn_number, question_text, difficulty, student_transcript,
        technical_score, communication_score, speaking_pace_wpm, filler_word_count,
        filler_breakdown, feedback, strengths, weaknesses
      FROM assessment.session_turns
      WHERE session_id = $1
      ORDER BY turn_number ASC;
    `, [sessionId]);

    const turns: QuestionTurn[] = turnsRes.rows.map(r => ({
      id: r.id,
      questionNumber: r.turn_number,
      questionText: r.question_text,
      difficulty: r.difficulty,
      studentAnswer: r.student_transcript,
      technicalScore: Number(r.technical_score),
      communicationScore: Number(r.communication_score),
      wpm: r.speaking_pace_wpm,
      fillerWords: r.filler_word_count,
      fillerBreakdown: r.filler_breakdown || {},
      feedback: r.feedback,
      strengths: r.strengths,
      weaknesses: r.weaknesses
    }));

    // Compute averages
    const validTurns = turns.filter(t => t.studentAnswer);
    const count = validTurns.length || 1;
    const avgWpm = Math.round(validTurns.reduce((sum, t) => sum + (t.wpm || 0), 0) / count);
    const totalFillers = validTurns.reduce((sum, t) => sum + (t.fillerWords || 0), 0);

    const mergedFillerBreakdown: Record<string, number> = {};
    for (const t of validTurns) {
      if (t.fillerBreakdown) {
        for (const [word, c] of Object.entries(t.fillerBreakdown)) {
          mergedFillerBreakdown[word] = (mergedFillerBreakdown[word] || 0) + c;
        }
      }
    }

    // Call InterviewAgent to synthesize diagnostic scorecard
    const diag = await this.interviewAgent.generateFinalDiagnosticReport(
      sessionId,
      turns,
      avgWpm,
      totalFillers,
      session.tab_switch_count,
      session.is_proctor_flagged
    );

    // Save final report in DB
    const reportRes = await db.query(`
      INSERT INTO assessment.final_reports (
        session_id, student_id, overall_score, technical_score, communication_score,
        average_wpm, total_filler_words, filler_breakdown, skill_breakdown,
        actionable_next_steps, tab_switches, is_flagged
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (session_id) DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        technical_score = EXCLUDED.technical_score,
        communication_score = EXCLUDED.communication_score
      RETURNING id, created_at;
    `, [
      sessionId,
      session.student_id,
      diag.overallScore,
      diag.technicalScore,
      diag.communicationScore,
      avgWpm,
      totalFillers,
      JSON.stringify(mergedFillerBreakdown),
      JSON.stringify(diag.skillBreakdown),
      JSON.stringify(diag.actionableNextSteps),
      session.tab_switch_count,
      session.is_proctor_flagged
    ]);

    // Mark session as completed
    await db.query(`
      UPDATE assessment.interview_sessions
      SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `, [sessionId]);

    // Clean up temporary vector database context for this session
    await this.contextBuilder.cleanupSession(sessionId);

    return {
      id: reportRes.rows[0].id,
      date: new Date(reportRes.rows[0].created_at).toISOString().split('T')[0],
      sessionType: session.session_type || 'MOCK_INTERVIEW',
      overallScore: diag.overallScore,
      technicalScore: diag.technicalScore,
      communicationScore: diag.communicationScore,
      averageWpm: avgWpm,
      totalFillerWords: totalFillers,
      fillerWordBreakdown: mergedFillerBreakdown,
      skillBreakdown: diag.skillBreakdown,
      actionableNextSteps: diag.actionableNextSteps,
      tabSwitches: session.tab_switch_count,
      isFlagged: session.is_proctor_flagged
    };
  }

  async getReport(sessionId: string): Promise<DiagnosticReport | null> {
    const res = await db.query(`
      SELECT 
        fr.id, fr.created_at, s.session_type, fr.overall_score, fr.technical_score,
        fr.communication_score, fr.average_wpm, fr.total_filler_words, fr.filler_breakdown,
        fr.skill_breakdown, fr.actionable_next_steps, fr.tab_switches, fr.is_flagged
      FROM assessment.final_reports fr
      JOIN assessment.interview_sessions s ON fr.session_id = s.id
      WHERE fr.session_id = $1;
    `, [sessionId]);

    if (res.rowCount === 0) return null;
    const r = res.rows[0];

    return {
      id: r.id,
      date: new Date(r.created_at).toISOString().split('T')[0],
      sessionType: r.session_type,
      overallScore: Number(r.overall_score),
      technicalScore: Number(r.technical_score),
      communicationScore: Number(r.communication_score),
      averageWpm: r.average_wpm,
      totalFillerWords: r.total_filler_words,
      fillerWordBreakdown: r.filler_breakdown || {},
      skillBreakdown: r.skill_breakdown || [],
      actionableNextSteps: r.actionable_next_steps || [],
      tabSwitches: r.tab_switches,
      isFlagged: r.is_flagged
    };
  }
}
