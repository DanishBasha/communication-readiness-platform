import request from 'supertest';
import app from '../src/index';
import pool, { db } from '../src/config/database';

describe('Portals, Criteria Tasks & RBAC Enforcement', () => {
  let studentId: string;
  let studentToken: string;
  let mentorId: string;
  let mentorToken: string;
  let coordinatorToken: string;
  let taskId: string;

  beforeAll(async () => {
    // 1. Create a student
    const studentEmail = `rbac_student_${Date.now()}@college.edu`;
    const sRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'RBAC Test Student',
        email: studentEmail,
        password: 'password123',
        role: 'STUDENT',
        rollNumber: `21CS${Math.floor(1000 + Math.random() * 9000)}`,
        department: 'Information Technology',
        track: 'HOPE_ELITE'
      });
    studentId = sRes.body.user.id;
    studentToken = sRes.body.token;

    // 2. Create a faculty mentor
    const mentorEmail = `rbac_mentor_${Date.now()}@college.edu`;
    const mRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Dr. Faculty Mentor',
        email: mentorEmail,
        password: 'password123',
        role: 'FACULTY_MENTOR',
        department: 'Information Technology'
      });
    mentorId = mRes.body.user.id;
    mentorToken = mRes.body.token;

    // 3. Create a placement coordinator
    const coordEmail = `rbac_coord_${Date.now()}@college.edu`;
    const cRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Placement Officer',
        email: coordEmail,
        password: 'password123',
        role: 'PLACEMENT_COORDINATOR'
      });
    coordinatorToken = cRes.body.token;

    // 4. Assign student to mentor
    await db.query(`
      UPDATE college.students
      SET mentor_id = $1
      WHERE user_id = $2 OR id = $2;
    `, [mentorId, studentId]);

    // 5. Fetch a task ID from criteria_tasks
    const tRes = await db.query('SELECT id FROM college.criteria_tasks LIMIT 1;');
    taskId = tRes.rows[0].id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should allow student to toggle task completion status', async () => {
    const res = await request(app)
      .post(`/api/tasks/${studentId}/toggle/${taskId}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.isCompleted).toBe(true);
  });

  it('should allow faculty mentor to sign-off and verify a student task', async () => {
    const res = await request(app)
      .post(`/api/tasks/${studentId}/verify/${taskId}`)
      .set('Authorization', `Bearer ${mentorToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
  });

  it('should reject unauthenticated verification attempts with 401', async () => {
    const res = await request(app)
      .post(`/api/tasks/${studentId}/verify/${taskId}`)
      .send();

    expect(res.status).toBe(401);
  });

  it('should forbid student role from verifying tasks (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/tasks/${studentId}/verify/${taskId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('should fetch coordinator dashboard metrics for institutional oversight', async () => {
    const res = await request(app)
      .get('/api/admin/coordinator-stats');

    expect(res.status).toBe(200);
    expect(res.body.totalCandidates).toBeDefined();
    expect(res.body.placementReadyRate).toBeDefined();
    expect(res.body.pepDomainsCount).toBeDefined();
  });

  it('should create an interview assignment for a cohort', async () => {
    const res = await request(app)
      .post('/api/admin/assignments')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        title: 'Phase 1 Technical Assessment',
        targetDomainOrTrack: 'HOPE_ELITE',
        dueDate: '2026-10-30'
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Phase 1 Technical Assessment');
  });
});
