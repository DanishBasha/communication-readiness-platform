import { db } from '../config/database';
import { StudentProfile, ParsedResume, CodingHandles, CriteriaTask, DiagnosticReport } from '../types';

export class StudentService {
  async getStudentProfile(studentIdOrUserId: string): Promise<StudentProfile> {
    const query = `
      SELECT 
        s.id AS student_id,
        u.id AS user_id,
        u.name,
        u.email,
        s.roll_number,
        s.department,
        s.batch_year,
        s.track,
        d.name AS domain_name,
        m.name AS mentor_name,
        m.email AS mentor_email,
        s.github_handle,
        s.leetcode_handle,
        s.hackerrank_handle,
        s.codeforces_handle,
        s.codechef_handle,
        s.leetcode_solved,
        s.github_repos
      FROM college.students s
      JOIN identity.users u ON s.user_id = u.id
      LEFT JOIN college.domains d ON s.domain_id = d.id
      LEFT JOIN identity.users m ON s.mentor_id = m.id
      WHERE s.id::text = $1 OR s.user_id::text = $1 OR s.roll_number = $1;
    `;

    const res = await db.query(query, [studentIdOrUserId]);
    if (res.rowCount === 0) {
      throw new Error('Student profile not found.');
    }

    const row = res.rows[0];
    const studentId = row.student_id;

    // Fetch Resume
    const resumeRes = await db.query(
      'SELECT file_name, uploaded_at, parsed_summary, parsed_skills, parsed_projects FROM college.resumes WHERE student_id = $1',
      [studentId]
    );

    let resume: ParsedResume | null = null;
    if (resumeRes.rowCount && resumeRes.rowCount > 0) {
      const r = resumeRes.rows[0];
      resume = {
        fileName: r.file_name,
        parsedAt: new Date(r.uploaded_at).toISOString().split('T')[0],
        summary: r.parsed_summary || '',
        skills: r.parsed_skills || { languages: [], frameworks: [], databases: [], tools: [] },
        projects: r.parsed_projects || []
      };
    }

    // Fetch Criteria Tasks
    const tasksRes = await db.query(`
      SELECT 
        ct.id,
        ct.title,
        ct.description,
        ct.target_track,
        COALESCE(sts.is_completed, false) AS is_completed,
        COALESCE(sts.verified_by_mentor, false) AS verified_by_mentor,
        sts.verified_at
      FROM college.criteria_tasks ct
      LEFT JOIN college.student_task_status sts 
        ON ct.id = sts.task_id AND sts.student_id = $1
      ORDER BY ct.created_at ASC;
    `, [studentId]);

    const criteriaTasks: CriteriaTask[] = tasksRes.rows.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      targetTrack: t.target_track,
      isCompleted: t.is_completed,
      verifiedByMentor: t.verified_by_mentor,
      verifiedAt: t.verified_at ? new Date(t.verified_at).toISOString().split('T')[0] : undefined
    }));

    // Fetch Recent Reports
    const reportsRes = await db.query(`
      SELECT 
        fr.id,
        fr.created_at,
        s.session_type,
        fr.overall_score,
        fr.technical_score,
        fr.communication_score,
        fr.average_wpm,
        fr.total_filler_words,
        fr.filler_breakdown,
        fr.skill_breakdown,
        fr.actionable_next_steps,
        fr.tab_switches,
        fr.is_flagged
      FROM assessment.final_reports fr
      JOIN assessment.interview_sessions s ON fr.session_id = s.id
      WHERE fr.student_id = $1
      ORDER BY fr.created_at DESC
      LIMIT 10;
    `, [studentId]);

    const recentReports: DiagnosticReport[] = reportsRes.rows.map(r => ({
      id: r.id,
      date: new Date(r.created_at).toISOString().split('T')[0],
      sessionType: r.session_type || 'MOCK_INTERVIEW',
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
    }));

    const codingHandles: CodingHandles = {
      github: row.github_handle,
      leetcode: row.leetcode_handle,
      hackerrank: row.hackerrank_handle,
      codeforces: row.codeforces_handle,
      codechef: row.codechef_handle,
      leetcodeSolved: row.leetcode_solved,
      githubRepos: row.github_repos
    };

    return {
      id: row.student_id,
      name: row.name,
      rollNumber: row.roll_number,
      email: row.email,
      department: row.department,
      batchYear: row.batch_year,
      track: row.track,
      pepDomain: row.domain_name,
      mentorName: row.mentor_name || 'Unassigned',
      mentorEmail: row.mentor_email || '',
      codingHandles,
      resume,
      criteriaTasks,
      recentReports
    };
  }

  async updateCodingHandles(studentId: string, handles: CodingHandles): Promise<void> {
    await db.query(`
      UPDATE college.students
      SET 
        github_handle = COALESCE($1, github_handle),
        leetcode_handle = COALESCE($2, leetcode_handle),
        hackerrank_handle = COALESCE($3, hackerrank_handle),
        codeforces_handle = COALESCE($4, codeforces_handle),
        codechef_handle = COALESCE($5, codechef_handle),
        leetcode_solved = COALESCE($6, leetcode_solved),
        github_repos = COALESCE($7, github_repos)
      WHERE id = $8;
    `, [
      handles.github,
      handles.leetcode,
      handles.hackerrank,
      handles.codeforces,
      handles.codechef,
      handles.leetcodeSolved,
      handles.githubRepos,
      studentId
    ]);
  }

  private async resolveStudentId(studentId: string): Promise<string> {
    const res = await db.query(
      "SELECT id FROM college.students WHERE id::text = $1 OR user_id::text = $1 OR roll_number = $1 LIMIT 1",
      [studentId]
    );
    return res.rowCount && res.rowCount > 0 ? res.rows[0].id : studentId;
  }

  async saveParsedResume(studentId: string, parsed: ParsedResume, rawText?: string): Promise<void> {
    const resolvedId = await this.resolveStudentId(studentId);
    await db.query(`
      INSERT INTO college.resumes (
        student_id, file_name, parsed_summary, parsed_skills, parsed_projects, raw_text
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (student_id) DO UPDATE SET
        file_name = EXCLUDED.file_name,
        parsed_summary = EXCLUDED.parsed_summary,
        parsed_skills = EXCLUDED.parsed_skills,
        parsed_projects = EXCLUDED.parsed_projects,
        raw_text = EXCLUDED.raw_text,
        uploaded_at = CURRENT_TIMESTAMP;
    `, [
      resolvedId,
      parsed.fileName,
      parsed.summary,
      JSON.stringify(parsed.skills),
      JSON.stringify(parsed.projects),
      rawText || ''
    ]);
  }
}
