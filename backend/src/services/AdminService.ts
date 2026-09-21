import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { TrainerTenure, InterviewAssignment, UserRole } from '../types';

export class AdminService {
  // --- SYSTEM & PLACEMENT COORDINATOR CAPABILITIES ---
  async getCoordinatorMacroStats(): Promise<{
    totalCandidates: number;
    hopeEliteCount: number;
    pepDomainsCount: number;
    placementReadyRate: number;
    departmentStreamCount: number;
    hopeGeneralCount: number;
    pepTotalCount: number;
  }> {
    const totalRes = await db.query('SELECT COUNT(*) AS c FROM college.students');
    const eliteRes = await db.query("SELECT COUNT(*) AS c FROM college.students WHERE track = 'HOPE_ELITE'");
    const hopeGenRes = await db.query("SELECT COUNT(*) AS c FROM college.students WHERE track = 'HOPE_NON_ELITE'");
    const pepRes = await db.query("SELECT COUNT(*) AS c FROM college.students WHERE track = 'PEP'");
    const deptRes = await db.query("SELECT COUNT(*) AS c FROM college.students WHERE track = 'DEPARTMENT'");
    const domainsCountRes = await db.query("SELECT COUNT(*) AS c FROM college.domains WHERE track_category = 'PEP'");

    // Placement ready: students with latest overall score >= 75
    const readyRes = await db.query(`
      SELECT COUNT(DISTINCT student_id) AS c
      FROM assessment.final_reports
      WHERE overall_score >= 75;
    `);

    const total = parseInt(totalRes.rows[0].c, 10);
    const ready = parseInt(readyRes.rows[0].c, 10);
    const rate = total > 0 ? Math.round((ready / total) * 1000) / 10 : 0;

    return {
      totalCandidates: total,
      hopeEliteCount: parseInt(eliteRes.rows[0].c, 10),
      pepDomainsCount: parseInt(domainsCountRes.rows[0].c, 10),
      placementReadyRate: rate,
      departmentStreamCount: parseInt(deptRes.rows[0].c, 10),
      hopeGeneralCount: parseInt(hopeGenRes.rows[0].c, 10),
      pepTotalCount: parseInt(pepRes.rows[0].c, 10)
    };
  }

  async getSystemMacroStats(): Promise<{
    programAdminsCount: number;
    facultyMentorsCount: number;
    trainersCount: number;
    studentsCount: number;
  }> {
    const pRes = await db.query("SELECT COUNT(*) AS c FROM identity.users WHERE role = 'PROGRAM_ADMIN'");
    const fRes = await db.query("SELECT COUNT(*) AS c FROM identity.users WHERE role = 'FACULTY_MENTOR'");
    const tRes = await db.query("SELECT COUNT(*) AS c FROM identity.users WHERE role = 'TRAINER'");
    const sRes = await db.query("SELECT COUNT(*) AS c FROM identity.users WHERE role = 'STUDENT'");

    return {
      programAdminsCount: parseInt(pRes.rows[0].c, 10),
      facultyMentorsCount: parseInt(fRes.rows[0].c, 10),
      trainersCount: parseInt(tRes.rows[0].c, 10),
      studentsCount: parseInt(sRes.rows[0].c, 10)
    };
  }

  // --- SUPER ADMIN PROVISIONING ---
  async createProgramAdmin(data: { name: string; email: string; password?: string }, createdBy?: string): Promise<any> {
    const existing = await db.query('SELECT id FROM identity.users WHERE email = $1', [data.email.toLowerCase()]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new Error('A user with this email already exists.');
    }
    const hash = await bcrypt.hash(data.password || 'admin123', 10);
    const res = await db.query(`
      INSERT INTO identity.users (name, email, password_hash, role, status, is_email_verified, created_by)
      VALUES ($1, $2, $3, 'PROGRAM_ADMIN', 'ACTIVE', true, $4)
      RETURNING id, name, email, role, status, created_at AS "createdAt", updated_at AS "updatedAt";
    `, [data.name, data.email.toLowerCase(), hash, createdBy || null]);
    return res.rows[0];
  }

  async getProgramAdmins(): Promise<any[]> {
    const res = await db.query(`
      SELECT id, name, email, role, status, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM identity.users
      WHERE role = 'PROGRAM_ADMIN'
      ORDER BY created_at DESC;
    `);
    return res.rows;
  }

  // --- PROGRAM ADMIN PROVISIONING ---
  async createFacultyMentor(data: { name: string; email: string; password?: string }, createdBy?: string): Promise<any> {
    const existing = await db.query('SELECT id FROM identity.users WHERE email = $1', [data.email.toLowerCase()]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new Error('A user with this email already exists.');
    }
    const hash = await bcrypt.hash(data.password || 'mentor123', 10);
    const res = await db.query(`
      INSERT INTO identity.users (name, email, password_hash, role, status, is_email_verified, created_by)
      VALUES ($1, $2, $3, 'FACULTY_MENTOR', 'ACTIVE', true, $4)
      RETURNING id, name, email, role, status, created_at AS "createdAt", updated_at AS "updatedAt";
    `, [data.name, data.email.toLowerCase(), hash, createdBy || null]);
    return res.rows[0];
  }

  async getFacultyMentors(requestingUser?: { id: string; role: string }): Promise<any[]> {
    let whereClause = "WHERE u.role = 'FACULTY_MENTOR'";
    const values: any[] = [];

    if (requestingUser?.role === 'PROGRAM_ADMIN') {
      whereClause += ' AND (u.created_by = $1)';
      values.push(requestingUser.id);
    }

    const res = await db.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.status, 
        u.created_by AS "createdBy",
        u.created_at AS "createdAt",
        COUNT(s.id)::int AS "menteeCount"
      FROM identity.users u
      LEFT JOIN college.students s ON s.mentor_id = u.id
      ${whereClause}
      GROUP BY u.id, u.name, u.email, u.role, u.status, u.created_by, u.created_at
      ORDER BY u.created_at DESC;
    `, values);
    return res.rows;
  }

  async assignMentorToStudent(studentId: string, mentorId: string): Promise<void> {
    const mRes = await db.query("SELECT id FROM identity.users WHERE id = $1 AND role = 'FACULTY_MENTOR'", [mentorId]);
    if (mRes.rowCount === 0) {
      throw new Error('Specified mentor is not a valid Faculty Mentor.');
    }
    const sRes = await db.query('SELECT id FROM college.students WHERE id = $1', [studentId]);
    if (sRes.rowCount === 0) {
      throw new Error('Student not found.');
    }
    await db.query('UPDATE college.students SET mentor_id = $1 WHERE id = $2', [mentorId, studentId]);
  }

  // --- GENERALIZED STUDENT PROVISIONING (SUPER ADMIN, PROGRAM ADMIN, FACULTY MENTOR) ---
  async createStudent(creatorUserId: string, creatorRole: string, data: {
    name: string;
    email: string;
    rollNumber: string;
    department: string;
    batchYear: number;
    track: 'HOPE_ELITE' | 'HOPE_NON_ELITE' | 'PEP' | 'DEPARTMENT';
    domainName?: string;
    mentorId?: string;
    password?: string;
  }): Promise<any> {
    const allowedTracks = ['HOPE_ELITE', 'HOPE_NON_ELITE', 'PEP', 'DEPARTMENT'];
    if (!allowedTracks.includes(data.track)) {
      throw new Error(`Invalid track for college student: ${data.track}. Only college tracks are permitted.`);
    }

    const existingEmail = await db.query('SELECT id FROM identity.users WHERE email = $1', [data.email.toLowerCase()]);
    if (existingEmail.rowCount && existingEmail.rowCount > 0) {
      throw new Error('A user with this email already exists.');
    }

    const existingRoll = await db.query('SELECT id FROM college.students WHERE roll_number = $1', [data.rollNumber]);
    if (existingRoll.rowCount && existingRoll.rowCount > 0) {
      throw new Error('A student with this roll number already exists.');
    }
    const hash = await bcrypt.hash(data.password || 'student123', 10);

    const uRes = await db.query(`
      INSERT INTO identity.users (name, email, password_hash, role, status, is_email_verified, created_by)
      VALUES ($1, $2, $3, 'STUDENT', 'ACTIVE', true, $4)
      RETURNING id, name, email, role, status;
    `, [data.name, data.email.toLowerCase(), hash, creatorUserId]);

    const user = uRes.rows[0];

    let domainId = null;
    if (data.domainName) {
      const dRes = await db.query('SELECT id FROM college.domains WHERE name = $1', [data.domainName]);
      if (dRes.rowCount && dRes.rowCount > 0) {
        domainId = dRes.rows[0].id;
      }
    }

    // Mentor determination
    let assignedMentorId: string | null = null;
    if (creatorRole === 'FACULTY_MENTOR') {
      assignedMentorId = creatorUserId;
    } else if (data.mentorId) {
      const mCheck = await db.query("SELECT id FROM identity.users WHERE id = $1 AND role = 'FACULTY_MENTOR'", [data.mentorId]);
      if (mCheck.rowCount && mCheck.rowCount > 0) {
        assignedMentorId = data.mentorId;
      }
    }

    const sRes = await db.query(`
      INSERT INTO college.students (
        user_id, roll_number, department, batch_year, track, domain_id, mentor_id, created_by, leetcode_solved, github_repos
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0)
      RETURNING id, roll_number, department, batch_year, track, mentor_id, created_by;
    `, [user.id, data.rollNumber, data.department, data.batchYear, data.track, domainId, assignedMentorId, creatorUserId]);

    const student = sRes.rows[0];

    // Seed criteria tasks for this student
    await db.query(`
      INSERT INTO college.student_task_status (student_id, task_id, is_completed, verified_by_mentor)
      SELECT $1, id, false, false
      FROM college.criteria_tasks
      ON CONFLICT (student_id, task_id) DO NOTHING;
    `, [student.id]);

    return {
      user,
      student
    };
  }

  async createStudentByMentor(mentorUserId: string, data: any): Promise<any> {
    return this.createStudent(mentorUserId, 'FACULTY_MENTOR', data);
  }

  // --- CASCADING USER REMOVAL WITH ROOT SUPER ADMIN IMMUNITY ---
  async removeUser(targetUserId: string, requestingUser: { id: string; role: string }): Promise<{ success: boolean; message: string }> {
    const uRes = await db.query(`
      SELECT id, name, email, role, created_by 
      FROM identity.users 
      WHERE id = $1
    `, [targetUserId]);

    if (uRes.rowCount === 0) {
      throw new Error('User not found.');
    }

    const targetUser = uRes.rows[0];

    // 1. Permanent Super Admin Immunity Shield
    if (targetUser.role === 'SUPER_ADMIN' || targetUser.email.toLowerCase() === 'admin@college.edu') {
      const err = new Error('Forbidden: The Super Administrator account is permanently protected and cannot be removed by anyone.');
      (err as any).statusCode = 403;
      throw err;
    }

    // 2. Self-deletion prevention
    if (targetUser.id === requestingUser.id) {
      const err = new Error('Forbidden: Users cannot delete their own account.');
      (err as any).statusCode = 403;
      throw err;
    }

    // 3. Role-Based Hierarchy Check
    if (requestingUser.role === 'SUPER_ADMIN') {
      // Super Admin can remove any non-super-admin user
    } else if (requestingUser.role === 'PROGRAM_ADMIN') {
      // Program Admin can remove Faculty Mentor, Domain Trainer, Student
      if (targetUser.role === 'SUPER_ADMIN' || targetUser.role === 'PROGRAM_ADMIN') {
        const err = new Error('Forbidden: Program Admins cannot remove Super Administrators or other Program Admins.');
        (err as any).statusCode = 403;
        throw err;
      }
    } else if (requestingUser.role === 'FACULTY_MENTOR') {
      // Faculty Mentor can ONLY remove Students assigned to or created by them
      if (targetUser.role !== 'STUDENT') {
        const err = new Error('Forbidden: Faculty Mentors can only remove student accounts.');
        (err as any).statusCode = 403;
        throw err;
      }
      const sCheck = await db.query(`
        SELECT id FROM college.students 
        WHERE user_id = $1 AND (mentor_id = $2 OR created_by = $2)
      `, [targetUser.id, requestingUser.id]);
      if (sCheck.rowCount === 0) {
        const err = new Error('Forbidden: Faculty Mentors can only remove students under their direct mentorship.');
        (err as any).statusCode = 403;
        throw err;
      }
    } else {
      const err = new Error('Forbidden: You do not have permission to remove users.');
      (err as any).statusCode = 403;
      throw err;
    }

    // 4. Delete user (cascades to students, resumes, sessions, reports, and tenures)
    await db.query('DELETE FROM identity.users WHERE id = $1', [targetUserId]);

    return {
      success: true,
      message: `${targetUser.name} (${targetUser.role}) has been removed successfully.`
    };
  }

  // --- SCOPED STUDENT LISTING ---
  async getFilteredStudents(params: {
    cohort?: string;
    domainId?: string;
    search?: string;
    mentorId?: string;
    requestingUser?: { id: string; role: string };
  }): Promise<any[]> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let idx = 1;

    // Role-based visibility scoping
    if (params.requestingUser) {
      if (params.requestingUser.role === 'SUPER_ADMIN') {
        // Super Admin sees all students
      } else if (params.requestingUser.role === 'FACULTY_MENTOR') {
        whereClause += ` AND (s.mentor_id = $${idx} OR s.created_by = $${idx})`;
        values.push(params.requestingUser.id);
        idx++;
      } else if (params.requestingUser.role === 'PROGRAM_ADMIN') {
        whereClause += ` AND (s.created_by = $${idx} OR s.mentor_id IN (SELECT id FROM identity.users WHERE created_by = $${idx}))`;
        values.push(params.requestingUser.id);
        idx++;
      } else if (params.requestingUser.role === 'TRAINER') {
        whereClause += ` AND s.domain_id IN (SELECT domain_id FROM college.trainer_tenures WHERE trainer_id = $${idx} AND is_active = true)`;
        values.push(params.requestingUser.id);
        idx++;
      }
    }

    if (params.cohort && params.cohort !== 'ALL') {
      whereClause += ` AND s.track = $${idx++}`;
      values.push(params.cohort);
    }

    if (params.domainId) {
      whereClause += ` AND s.domain_id = $${idx++}`;
      values.push(params.domainId);
    }

    if (params.mentorId) {
      whereClause += ` AND s.mentor_id = $${idx++}`;
      values.push(params.mentorId);
    }

    if (params.search) {
      whereClause += ` AND (u.name ILIKE $${idx} OR s.roll_number ILIKE $${idx})`;
      values.push(`%${params.search}%`);
      idx++;
    }

    const query = `
      SELECT 
        s.id,
        s.user_id AS "userId",
        u.name,
        u.email,
        s.roll_number AS "rollNumber",
        s.track,
        COALESCE(d.name, 'Department General') AS domain,
        s.department,
        s.batch_year AS "batchYear",
        s.leetcode_solved AS "leetcodeSolved",
        m.name AS "mentorName",
        s.mentor_id AS "mentorId",
        s.created_by AS "createdBy",
        COALESCE(rep.overall_score, 0) AS score,
        CASE 
          WHEN rep.overall_score >= 80 THEN 'PLACEMENT_READY'
          WHEN rep.overall_score >= 65 THEN 'ON_TRACK'
          WHEN rep.overall_score IS NULL THEN 'NOT_ATTENDED'
          ELSE 'NEEDS_ATTENTION'
        END AS status,
        CONCAT(
          (SELECT COUNT(*) FROM college.student_task_status WHERE student_id = s.id AND verified_by_mentor = true),
          '/',
          (SELECT COUNT(*) FROM college.criteria_tasks)
        ) AS checklist
      FROM college.students s
      JOIN identity.users u ON s.user_id = u.id
      LEFT JOIN college.domains d ON s.domain_id = d.id
      LEFT JOIN identity.users m ON s.mentor_id = m.id
      LEFT JOIN LATERAL (
        SELECT overall_score
        FROM assessment.final_reports
        WHERE student_id = s.id
        ORDER BY created_at DESC
        LIMIT 1
      ) rep ON true
      ${whereClause}
      ORDER BY u.name ASC;
    `;

    const res = await db.query(query, values);
    return res.rows;
  }

  // --- DEEP DIVE STUDENT HISTORY & ACTIVITY TELEMETRY ---
  async getStudentCompleteHistory(studentIdOrUserId: string, requestingUser?: { id: string; role: string }): Promise<any> {
    const sRes = await db.query(`
      SELECT 
        s.id AS student_id,
        s.user_id,
        u.name,
        u.email,
        s.roll_number,
        s.department,
        s.batch_year,
        s.track,
        s.domain_id,
        d.name AS domain_name,
        s.mentor_id,
        m.name AS mentor_name,
        m.email AS mentor_email,
        s.created_by,
        s.github_handle,
        s.leetcode_handle,
        s.hackerrank_handle,
        s.codeforces_handle,
        s.codechef_handle,
        s.leetcode_solved,
        s.github_repos,
        s.created_at
      FROM college.students s
      JOIN identity.users u ON s.user_id = u.id
      LEFT JOIN college.domains d ON s.domain_id = d.id
      LEFT JOIN identity.users m ON s.mentor_id = m.id
      WHERE s.id::text = $1 OR s.user_id::text = $1 OR s.roll_number = $1;
    `, [studentIdOrUserId]);

    if (sRes.rowCount === 0) {
      throw new Error('Student profile not found.');
    }

    const student = sRes.rows[0];

    // Scoped Access Check
    if (requestingUser) {
      if (requestingUser.role === 'SUPER_ADMIN') {
        // Unrestricted
      } else if (requestingUser.role === 'FACULTY_MENTOR') {
        if (student.mentor_id !== requestingUser.id && student.created_by !== requestingUser.id) {
          const err = new Error('Forbidden: Faculty Mentors can only view profiles and reports of their assigned students.');
          (err as any).statusCode = 403;
          throw err;
        }
      } else if (requestingUser.role === 'PROGRAM_ADMIN') {
        const creatorCheck = await db.query(`
          SELECT 1 FROM identity.users WHERE id = $1 AND (created_by = $2 OR id = $2)
        `, [student.created_by || student.mentor_id, requestingUser.id]);
        if (student.created_by !== requestingUser.id && creatorCheck.rowCount === 0) {
          const err = new Error('Forbidden: Program Admins can only view profiles and reports of students created under their administration.');
          (err as any).statusCode = 403;
          throw err;
        }
      } else if (requestingUser.role === 'TRAINER') {
        const domainCheck = await db.query(`
          SELECT 1 FROM college.trainer_tenures 
          WHERE trainer_id = $1 AND domain_id = $2 AND is_active = true
        `, [requestingUser.id, student.domain_id]);
        if (domainCheck.rowCount === 0) {
          const err = new Error('Forbidden: Domain Trainers can only view reports of students within their assigned domain.');
          (err as any).statusCode = 403;
          throw err;
        }
      } else if (requestingUser.role === 'STUDENT') {
        if (student.user_id !== requestingUser.id) {
          const err = new Error('Forbidden: Students can only view their own profile.');
          (err as any).statusCode = 403;
          throw err;
        }
      }
    }

    // Resume
    const resumeRes = await db.query(
      'SELECT file_name, uploaded_at, parsed_summary, parsed_skills, parsed_projects FROM college.resumes WHERE student_id = $1',
      [student.student_id]
    );
    let resume = null;
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

    // Criteria checklist
    const tasksRes = await db.query(`
      SELECT 
        ct.id, ct.title, ct.description, ct.target_track,
        COALESCE(sts.is_completed, false) AS is_completed,
        sts.completed_at,
        COALESCE(sts.verified_by_mentor, false) AS verified_by_mentor,
        sts.verified_at
      FROM college.criteria_tasks ct
      LEFT JOIN college.student_task_status sts 
        ON ct.id = sts.task_id AND sts.student_id = $1
      ORDER BY ct.created_at ASC;
    `, [student.student_id]);

    // Sessions & Turns
    const sessRes = await db.query(`
      SELECT 
        s.id,
        s.session_type,
        s.current_difficulty,
        s.status,
        s.tab_switch_count,
        s.is_proctor_flagged,
        s.started_at,
        s.completed_at,
        fr.overall_score,
        fr.technical_score,
        fr.communication_score,
        fr.average_wpm,
        fr.total_filler_words,
        fr.filler_breakdown,
        fr.skill_breakdown,
        fr.actionable_next_steps
      FROM assessment.interview_sessions s
      LEFT JOIN assessment.final_reports fr ON fr.session_id = s.id
      WHERE s.student_id = $1
      ORDER BY s.started_at DESC;
    `, [student.student_id]);

    const interviewSessions = [];
    for (const sess of sessRes.rows) {
      const turnsRes = await db.query(`
        SELECT 
          turn_number,
          question_text,
          difficulty,
          student_transcript,
          technical_score,
          communication_score,
          speaking_pace_wpm,
          filler_word_count,
          feedback,
          strengths,
          weaknesses
        FROM assessment.session_turns
        WHERE session_id = $1
        ORDER BY turn_number ASC;
      `, [sess.id]);

      interviewSessions.push({
        id: sess.id,
        sessionType: sess.session_type,
        difficulty: sess.current_difficulty,
        status: sess.status,
        tabSwitchCount: sess.tab_switch_count,
        isProctorFlagged: sess.is_proctor_flagged,
        startedAt: sess.started_at,
        completedAt: sess.completed_at,
        report: sess.overall_score !== null ? {
          overallScore: Number(sess.overall_score),
          technicalScore: Number(sess.technical_score),
          communicationScore: Number(sess.communication_score),
          averageWpm: sess.average_wpm,
          totalFillerWords: sess.total_filler_words,
          fillerBreakdown: sess.filler_breakdown || {},
          skillBreakdown: sess.skill_breakdown || [],
          actionableNextSteps: sess.actionable_next_steps || []
        } : null,
        turns: turnsRes.rows
      });
    }

    return {
      student,
      resume,
      checklist: tasksRes.rows,
      interviewSessions
    };
  }

  // --- FACULTY MENTOR CAPABILITIES ---
  async getMentorMentees(mentorUserId: string): Promise<any[]> {
    return this.getFilteredStudents({ mentorId: mentorUserId, requestingUser: { id: mentorUserId, role: 'FACULTY_MENTOR' } });
  }

  // --- PROGRAM ADMIN & TRAINER TENURE MANAGEMENT ---
  async getTrainerTenures(requestingUser?: { id: string; role: string }): Promise<TrainerTenure[]> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];

    if (requestingUser?.role === 'PROGRAM_ADMIN') {
      whereClause += ' AND (tt.created_by = $1 OR tt.trainer_id IN (SELECT id FROM identity.users WHERE created_by = $1))';
      values.push(requestingUser.id);
    }

    const res = await db.query(`
      SELECT 
        tt.id,
        u.id AS "trainerUserId",
        u.name AS "trainerName",
        u.email AS "trainerEmail",
        tt.company_or_institute AS "companyOrInstitute",
        d.name AS domain,
        tt.start_date AS "startDate",
        tt.end_date AS "endDate",
        (tt.is_active AND CURRENT_DATE <= tt.end_date) AS "isActive",
        tt.created_by AS "createdBy"
      FROM college.trainer_tenures tt
      JOIN identity.users u ON tt.trainer_id = u.id
      JOIN college.domains d ON tt.domain_id = d.id
      ${whereClause}
      ORDER BY tt.start_date DESC;
    `, values);

    return res.rows.map(r => ({
      ...r,
      startDate: new Date(r.startDate).toISOString().split('T')[0],
      endDate: new Date(r.endDate).toISOString().split('T')[0]
    }));
  }

  async onboardTrainer(data: {
    trainerName: string;
    trainerEmail: string;
    companyOrInstitute: string;
    domainName: string;
    startDate: string;
    endDate: string;
  }, createdBy?: string): Promise<TrainerTenure> {
    // 1. Get or create trainer user account
    let userRes = await db.query('SELECT id FROM identity.users WHERE email = $1', [data.trainerEmail.toLowerCase()]);
    let trainerUserId: string;

    if (userRes.rowCount === 0) {
      const hash = await bcrypt.hash('trainer123', 10);
      const newU = await db.query(`
        INSERT INTO identity.users (name, email, password_hash, role, status, created_by)
        VALUES ($1, $2, $3, 'TRAINER', 'ACTIVE', $4)
        RETURNING id;
      `, [data.trainerName, data.trainerEmail.toLowerCase(), hash, createdBy || null]);
      trainerUserId = newU.rows[0].id;
    } else {
      trainerUserId = userRes.rows[0].id;
    }

    // 2. Lookup domain
    const dRes = await db.query('SELECT id, name FROM college.domains WHERE name = $1', [data.domainName]);
    if (dRes.rowCount === 0) {
      throw new Error(`Domain '${data.domainName}' not found.`);
    }
    const domainId = dRes.rows[0].id;

    // 3. Create tenure
    const tRes = await db.query(`
      INSERT INTO college.trainer_tenures (
        trainer_id, domain_id, company_or_institute, start_date, end_date, is_active, created_by
      )
      VALUES ($1, $2, $3, $4, $5, true, $6)
      RETURNING id, start_date, end_date, is_active;
    `, [trainerUserId, domainId, data.companyOrInstitute, data.startDate, data.endDate, createdBy || null]);

    return {
      id: tRes.rows[0].id,
      trainerName: data.trainerName,
      trainerEmail: data.trainerEmail,
      companyOrInstitute: data.companyOrInstitute,
      domain: data.domainName,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: true
    };
  }

  async revokeTrainerTenure(tenureId: string, revokedByUserId?: string): Promise<void> {
    await db.query(`
      UPDATE college.trainer_tenures
      SET 
        is_active = false,
        revoked_at = CURRENT_TIMESTAMP,
        revoked_by = $1
      WHERE id = $2;
    `, [revokedByUserId || null, tenureId]);
  }

  // --- INTERVIEW ASSIGNMENT MATRIX ---
  async getAssignments(): Promise<InterviewAssignment[]> {
    const res = await db.query(`
      SELECT 
        ia.id,
        ia.title,
        ia.assigned_by_role AS "assignedByRole",
        u.name AS "assignedByName",
        ia.target_track_or_domain AS "targetDomainOrTrack",
        ia.due_date AS "dueDate",
        ia.is_mandatory AS "isMandatory"
      FROM assessment.interview_assignments ia
      LEFT JOIN identity.users u ON ia.assigned_by_id = u.id
      ORDER BY ia.created_at DESC;
    `);

    return res.rows.map(r => ({
      ...r,
      dueDate: r.dueDate ? new Date(r.dueDate).toISOString().split('T')[0] : '2026-09-30'
    }));
  }

  async createAssignment(data: {
    title: string;
    assignedById: string;
    assignedByRole: 'PLACEMENT_COORDINATOR' | 'PROGRAM_ADMIN' | 'TRAINER';
    targetDomainOrTrack: string;
    domainId?: string;
    dueDate: string;
    isMandatory?: boolean;
  }): Promise<InterviewAssignment> {
    const isUuid = Boolean(data.assignedById && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.assignedById));
    let assignedByName = 'Staff Member';
    if (isUuid) {
      const uRes = await db.query('SELECT name FROM identity.users WHERE id = $1', [data.assignedById]);
      assignedByName = uRes.rows[0]?.name || 'Staff Member';
    }

    const res = await db.query(`
      INSERT INTO assessment.interview_assignments (
        title, assigned_by_id, assigned_by_role, target_track_or_domain, domain_id, due_date, is_mandatory
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, assigned_by_role, target_track_or_domain, due_date, is_mandatory;
    `, [
      data.title,
      isUuid ? data.assignedById : null,
      data.assignedByRole,
      data.targetDomainOrTrack,
      data.domainId || null,
      data.dueDate,
      data.isMandatory ?? true
    ]);

    const r = res.rows[0];
    return {
      id: r.id,
      title: r.title,
      assignedByRole: r.assigned_by_role,
      assignedByName,
      targetDomainOrTrack: r.target_track_or_domain,
      dueDate: new Date(r.due_date).toISOString().split('T')[0],
      isMandatory: r.is_mandatory
    };
  }

  // --- PROGRAM & DOMAINS DIRECTORY ---
  async getPepDomains(): Promise<string[]> {
    const res = await db.query(`
      SELECT name FROM college.domains
      WHERE track_category = 'PEP' AND is_active = true
      ORDER BY name ASC;
    `);
    return res.rows.map(r => r.name);
  }
}
