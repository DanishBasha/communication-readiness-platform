import request from 'supertest';
import app from '../src/index';
import pool, { db } from '../src/config/database';

describe('Interview Lifecycle & Autonomous Agent Pipeline', () => {
  let studentId: string;
  let testEmail: string;

  beforeAll(async () => {
    testEmail = `agent_test_${Date.now()}@college.edu`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Interview Test Candidate',
        email: testEmail,
        password: 'password123',
        role: 'STUDENT',
        rollNumber: `21CS${Math.floor(1000 + Math.random() * 9000)}`,
        department: 'Computer Science & Engineering',
        track: 'HOPE_ELITE'
      });

    const sRes = await db.query('SELECT id FROM college.students WHERE user_id = $1', [regRes.body.user.id]);
    studentId = sRes.rows[0].id;

    // Seed a mock resume for this student
    await db.query(`
      INSERT INTO college.resumes (student_id, file_name, file_size, parsed_summary, parsed_skills, parsed_projects)
      VALUES ($1, 'candidate_resume.pdf', 102400, 'Frontend and React specialist with TypeScript experience', 
        '{"languages": ["TypeScript", "Python"], "frameworks": ["React", "Node.js"], "databases": ["PostgreSQL"], "tools": ["Git"]}',
        '[{"title": "E-Commerce Web App", "description": "Built full stack portal with microservices"}]'
      )
      ON CONFLICT (student_id) DO NOTHING;
    `, [studentId]);
  });

  afterAll(async () => {
    await pool.end();
  });

  let activeSessionId: string;

  it('should start an interview session and generate the first resume-grounded question', async () => {
    const res = await request(app)
      .post('/api/interviews/start')
      .send({
        studentId,
        sessionType: 'MOCK_INTERVIEW'
      });

    expect(res.status).toBe(201);
    expect(res.body.sessionId).toBeDefined();
    expect(res.body.firstQuestion).toBeDefined();
    expect(res.body.firstQuestion.questionNumber).toBe(1);
    expect(res.body.firstQuestion.difficulty).toBe('EASY');
    expect(res.body.firstQuestion.questionText).toBeTruthy();

    activeSessionId = res.body.sessionId;
  });

  it('should record proctoring events and flag candidates exceeding thresholds', async () => {
    // 1st tab switch
    const res1 = await request(app)
      .post(`/api/interviews/${activeSessionId}/proctor-event`)
      .send({ eventType: 'TAB_SWITCH' });
    expect(res1.status).toBe(200);
    expect(res1.body.tabSwitches).toBe(1);
    expect(res1.body.isFlagged).toBe(false);

    // Increment to 4 tab switches
    await request(app).post(`/api/interviews/${activeSessionId}/proctor-event`).send({ eventType: 'TAB_SWITCH' });
    await request(app).post(`/api/interviews/${activeSessionId}/proctor-event`).send({ eventType: 'TAB_SWITCH' });
    const res4 = await request(app)
      .post(`/api/interviews/${activeSessionId}/proctor-event`)
      .send({ eventType: 'TAB_SWITCH' });

    expect(res4.status).toBe(200);
    expect(res4.body.tabSwitches).toBe(4);
    expect(res4.body.isFlagged).toBe(true);
  });

  it('should submit an answer, compute speech metrics, evaluate turn, and adapt difficulty', async () => {
    const studentAnswer = "Well, um, I used React and Node.js to build the microservices architecture, and like, it handled high traffic with PostgreSQL.";

    const res = await request(app)
      .post(`/api/interviews/${activeSessionId}/submit-answer`)
      .send({
        studentAnswer,
        estimatedDurationSeconds: 15
      });

    expect(res.status).toBe(200);
    expect(res.body.isCompleted).toBe(false);
    expect(res.body.turnEvaluation).toBeDefined();
    expect(res.body.turnEvaluation.studentAnswer).toBe(studentAnswer);
    expect(res.body.turnEvaluation.technicalScore).toBeGreaterThanOrEqual(0);
    expect(res.body.turnEvaluation.communicationScore).toBeGreaterThanOrEqual(0);
    expect(res.body.turnEvaluation.wpm).toBeGreaterThan(0);
    expect(res.body.turnEvaluation.fillerWords).toBeGreaterThanOrEqual(2); // 'um', 'like'
    expect(res.body.nextQuestion).toBeDefined();
    expect(res.body.nextQuestion.questionNumber).toBe(2);
  });

  it('should finalize interview and produce a comprehensive diagnostic report', async () => {
    const res = await request(app)
      .post(`/api/interviews/${activeSessionId}/finalize`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.overallScore).toBeDefined();
    expect(res.body.technicalScore).toBeDefined();
    expect(res.body.communicationScore).toBeDefined();
    expect(res.body.averageWpm).toBeDefined();
    expect(res.body.totalFillerWords).toBeDefined();
    expect(res.body.skillBreakdown).toBeDefined();
    expect(res.body.actionableNextSteps).toBeInstanceOf(Array);
    expect(res.body.isFlagged).toBe(true); // Flagged due to 4 tab switches
  });

  it('should retrieve the persisted diagnostic report via GET endpoint', async () => {
    const res = await request(app)
      .get(`/api/interviews/${activeSessionId}/report`);

    expect(res.status).toBe(200);
    expect(res.body.overallScore).toBeDefined();
    expect(res.body.isFlagged).toBe(true);
  });
});
