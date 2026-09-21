import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { db } from '../config/database';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' lacks permissions for this resource. Required: [${allowedRoles.join(', ')}]`
      });
      return;
    }

    next();
  };
};

export const requireStudentSelfOrStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  // Super-admin and Program Admin have college-wide student access
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'PROGRAM_ADMIN' || req.user.role === 'PLACEMENT_COORDINATOR') {
    return next();
  }

  const requestedStudentId = req.params.studentId || req.params.id;

  if (req.user.role === 'STUDENT') {
    // Check if the student user owns this student profile
    const studentRes = await db.query(
      'SELECT id FROM college.students WHERE user_id = $1',
      [req.user.id]
    );

    if (studentRes.rowCount === 0 || studentRes.rows[0].id !== requestedStudentId) {
      res.status(403).json({ error: 'Forbidden: Students may only access their own profile.' });
      return;
    }
    return next();
  }

  if (req.user.role === 'FACULTY_MENTOR') {
    // Check if student is assigned to this mentor
    const mentorRes = await db.query(
      'SELECT id FROM college.students WHERE id = $1 AND mentor_id = $2',
      [requestedStudentId, req.user.id]
    );

    if (mentorRes.rowCount === 0) {
      res.status(403).json({ error: 'Forbidden: Faculty Mentors can only inspect their assigned ~25 mentees.' });
      return;
    }
    return next();
  }

  // Program Admins and Trainers can proceed to domain-scoped checks in their controllers
  next();
};

export const requireActiveTrainerTenure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (req.user.role !== 'TRAINER') {
    return next();
  }

  // Verify trainer has an active tenure today
  const tenureRes = await db.query(`
    SELECT id, domain_id, start_date, end_date
    FROM college.trainer_tenures
    WHERE trainer_id = $1 AND is_active = true AND CURRENT_DATE BETWEEN start_date AND end_date
  `, [req.user.id]);

  if (tenureRes.rowCount === 0) {
    res.status(403).json({
      error: 'Forbidden: Trainer tenure is either inactive, expired, or has been revoked by Program Admin.'
    });
    return;
  }

  next();
};
