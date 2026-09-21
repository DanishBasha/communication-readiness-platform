import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { config } from '../config/env';
import { UserRole, User } from '../types';

export class AuthService {
  async register(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    rollNumber?: string;
    department?: string;
    batchYear?: number;
    track?: 'HOPE_ELITE' | 'HOPE_NON_ELITE' | 'PEP' | 'DEPARTMENT';
    domainName?: string;
  }): Promise<{ user: User; token: string; studentId?: string }> {
    const existing = await db.query(
      'SELECT id FROM identity.users WHERE email = $1',
      [data.email.toLowerCase()]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const userRes = await db.query(`
      INSERT INTO identity.users (name, email, password_hash, role, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      RETURNING id, name, email, role, status, created_at, updated_at;
    `, [data.name, data.email.toLowerCase(), passwordHash, data.role]);

    const user: User = {
      id: userRes.rows[0].id,
      name: userRes.rows[0].name,
      email: userRes.rows[0].email,
      role: userRes.rows[0].role,
      status: userRes.rows[0].status,
      createdAt: userRes.rows[0].created_at,
      updatedAt: userRes.rows[0].updated_at
    };

    // If student, create college.students record
    let studentId: string | undefined;
    if (data.role === 'STUDENT') {
      let domainId = null;
      if (data.domainName) {
        const domRes = await db.query('SELECT id FROM college.domains WHERE name = $1', [data.domainName]);
        if (domRes.rowCount && domRes.rowCount > 0) {
          domainId = domRes.rows[0].id;
        }
      }

      const roll = data.rollNumber || `22CS${Math.floor(1000 + Math.random() * 9000)}`;
      const sRes = await db.query(`
        INSERT INTO college.students (
          user_id, roll_number, department, batch_year, track, domain_id, leetcode_solved, github_repos
        )
        VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
        ON CONFLICT (roll_number) DO UPDATE SET 
          user_id = EXCLUDED.user_id,
          department = EXCLUDED.department,
          batch_year = EXCLUDED.batch_year,
          track = EXCLUDED.track
        RETURNING id;
      `, [
        user.id,
        roll,
        data.department || 'Computer Science & Engineering',
        data.batchYear || 2026,
        data.track || 'HOPE_ELITE',
        domainId
      ]);
      if (sRes.rowCount && sRes.rowCount > 0) {
        studentId = sRes.rows[0].id;
      }
    }

    const token = this.generateToken(user);
    return { user, token, studentId };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string; studentId?: string }> {
    const res = await db.query(`
      SELECT id, name, email, password_hash, role, status, created_at, updated_at
      FROM identity.users
      WHERE email = $1;
    `, [email.toLowerCase()]);

    if (res.rowCount === 0) {
      throw new Error('Invalid email or password.');
    }

    const row = res.rows[0];
    if (row.status !== 'ACTIVE') {
      throw new Error('Account is inactive or suspended.');
    }

    if (row.is_email_verified === false) {
      throw new Error('Email verification required. Please verify your account with your 6-digit code before logging in.');
    }

    const isMatch = await bcrypt.compare(password, row.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      isEmailVerified: row.is_email_verified ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    let studentId: string | undefined;
    if (user.role === 'STUDENT') {
      const sRes = await db.query('SELECT id FROM college.students WHERE user_id = $1', [user.id]);
      if (sRes.rowCount && sRes.rowCount > 0) {
        studentId = sRes.rows[0].id;
      }
    }

    const token = this.generateToken(user);
    return { user, token, studentId };
  }

  async registerExternalStudent(data: {
    name: string;
    email: string;
    password: string;
    department?: string;
    batchYear?: number;
  }): Promise<{ message: string; email: string; simulatedVerificationCode: string }> {
    const existing = await db.query(
      'SELECT id FROM identity.users WHERE email = $1',
      [data.email.toLowerCase()]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      throw new Error('An account with this email already exists.');
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const passwordHash = await bcrypt.hash(data.password, 10);

    const userRes = await db.query(`
      INSERT INTO identity.users (name, email, password_hash, role, status, is_email_verified, verification_code)
      VALUES ($1, $2, $3, 'STUDENT', 'ACTIVE', false, $4)
      RETURNING id, name, email, role;
    `, [data.name, data.email.toLowerCase(), passwordHash, verificationCode]);

    const userId = userRes.rows[0].id;
    const roll = `EXT${Math.floor(10000 + Math.random() * 90000)}`;

    const sRes = await db.query(`
      INSERT INTO college.students (
        user_id, roll_number, department, batch_year, track, leetcode_solved, github_repos
      )
      VALUES ($1, $2, $3, $4, 'EXTERNAL', 0, 0)
      RETURNING id;
    `, [
      userId,
      roll,
      data.department || 'General Engineering',
      data.batchYear || new Date().getFullYear()
    ]);

    const studentId = sRes.rows[0]?.id;

    // Seed criteria tasks
    if (studentId) {
      await db.query(`
        INSERT INTO college.student_task_status (student_id, task_id, is_completed, verified_by_mentor)
        SELECT $1, id, false, false
        FROM college.criteria_tasks
        ON CONFLICT (student_id, task_id) DO NOTHING;
      `, [studentId]);
    }

    return {
      message: 'Registration initiated. Verification code sent to email.',
      email: data.email.toLowerCase(),
      simulatedVerificationCode: verificationCode
    };
  }

  async verifyEmailCode(email: string, code: string): Promise<{ user: User; token: string; studentId?: string }> {
    const res = await db.query(`
      SELECT id, name, email, role, status, verification_code, is_email_verified, created_at, updated_at
      FROM identity.users
      WHERE email = $1;
    `, [email.toLowerCase()]);

    if (res.rowCount === 0) {
      throw new Error('Account not found.');
    }

    const row = res.rows[0];
    if (row.verification_code !== code) {
      throw new Error('Invalid or expired verification code.');
    }

    await db.query(`
      UPDATE identity.users
      SET is_email_verified = true, verification_code = NULL
      WHERE id = $1;
    `, [row.id]);

    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      isEmailVerified: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    const sRes = await db.query('SELECT id FROM college.students WHERE user_id = $1', [user.id]);
    const studentId = sRes.rows[0]?.id;

    const token = this.generateToken(user);
    return { user, token, studentId };
  }

  async getMe(userId: string): Promise<{ user: User; studentId?: string }> {
    const res = await db.query(`
      SELECT id, name, email, role, status, created_at, updated_at
      FROM identity.users
      WHERE id = $1;
    `, [userId]);

    if (res.rowCount === 0) {
      throw new Error('User not found.');
    }

    const row = res.rows[0];
    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    let studentId: string | undefined;
    if (user.role === 'STUDENT') {
      const sRes = await db.query('SELECT id FROM college.students WHERE user_id = $1', [user.id]);
      if (sRes.rowCount && sRes.rowCount > 0) {
        studentId = sRes.rows[0].id;
      }
    }

    return { user, studentId };
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );
  }
}
