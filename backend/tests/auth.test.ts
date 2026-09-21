import request from 'supertest';
import app from '../src/index';
import pool from '../src/config/database';

describe('Auth & Identity Module', () => {
  const testEmail = `student_${Date.now()}@college.edu`;

  afterAll(async () => {
    await pool.end();
  });

  it('should register a new student successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Candidate',
        email: testEmail,
        password: 'password123',
        role: 'STUDENT',
        rollNumber: `21CS${Math.floor(1000 + Math.random() * 9000)}`,
        department: 'Computer Science & Engineering',
        track: 'HOPE_ELITE'
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.role).toBe('STUDENT');
  });

  it('should prevent duplicate registration with same email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Candidate',
        email: testEmail,
        password: 'password123',
        role: 'STUDENT'
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('already exists');
  });

  it('should login an existing user with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
  });

  it('should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Invalid email or password');
  });
});
