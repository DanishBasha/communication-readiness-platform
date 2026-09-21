import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/AdminService';

const adminService = new AdminService();

export class AdminController {
  static async getCoordinatorStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getCoordinatorMacroStats();
      res.json(stats);
    } catch (error: any) {
      next(error);
    }
  }

  static async getStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cohort, domainId, search, mentorId } = req.query;
      const students = await adminService.getFilteredStudents({
        cohort: cohort as string,
        domainId: domainId as string,
        search: search as string,
        mentorId: mentorId as string,
        requestingUser: req.user ? { id: req.user.id, role: req.user.role } : undefined
      });
      res.json(students);
    } catch (error: any) {
      next(error);
    }
  }

  static async getSystemStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getSystemMacroStats();
      res.json(stats);
    } catch (error: any) {
      next(error);
    }
  }

  static async createProgramAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      if (!name || !email) {
        res.status(400).json({ error: 'Name and email are required.' });
        return;
      }
      const admin = await adminService.createProgramAdmin({ name, email, password }, req.user?.id);
      res.status(201).json(admin);
    } catch (error: any) {
      next(error);
    }
  }

  static async getProgramAdmins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admins = await adminService.getProgramAdmins();
      res.json(admins);
    } catch (error: any) {
      next(error);
    }
  }

  static async createFacultyMentor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      if (!name || !email) {
        res.status(400).json({ error: 'Name and email are required.' });
        return;
      }
      const mentor = await adminService.createFacultyMentor({ name, email, password }, req.user?.id);
      res.status(201).json(mentor);
    } catch (error: any) {
      next(error);
    }
  }

  static async getFacultyMentors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mentors = await adminService.getFacultyMentors(req.user ? { id: req.user.id, role: req.user.role } : undefined);
      res.json(mentors);
    } catch (error: any) {
      next(error);
    }
  }

  static async assignMentor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId, mentorId } = req.body;
      if (!studentId || !mentorId) {
        res.status(400).json({ error: 'studentId and mentorId are required.' });
        return;
      }
      await adminService.assignMentorToStudent(studentId, mentorId);
      res.json({ message: 'Mentor assigned successfully.' });
    } catch (error: any) {
      next(error);
    }
  }

  // --- GENERALIZED STUDENT CREATION (SUPER_ADMIN, PROGRAM_ADMIN, FACULTY_MENTOR) ---
  static async createStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      const { name, email, rollNumber, department, batchYear, track, domainName, mentorId, password } = req.body;
      if (!name || !email || !rollNumber || !department || !batchYear || !track) {
        res.status(400).json({ error: 'Name, email, rollNumber, department, batchYear, and track are required.' });
        return;
      }
      const result = await adminService.createStudent(user.id, user.role, {
        name,
        email,
        rollNumber,
        department,
        batchYear: Number(batchYear),
        track,
        domainName,
        mentorId,
        password
      });
      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  }

  static async createStudentByMentor(req: Request, res: Response, next: NextFunction): Promise<void> {
    return AdminController.createStudent(req, res, next);
  }

  // --- CASCADING USER REMOVAL WITH ROOT SUPER ADMIN SHIELD ---
  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Target user ID is required.' });
        return;
      }
      const targetUserId = req.params.id as string;
      const result = await adminService.removeUser(targetUserId, { id: user.id, role: user.role });
      res.json(result);
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  // --- COMPLETE STUDENT ACTIVITY & HISTORY INSPECTOR ---
  static async getStudentFullHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      const targetStudentId = req.params.id as string;
      const history = await adminService.getStudentCompleteHistory(targetStudentId, { id: user.id, role: user.role });
      res.json(history);
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      next(error);
    }
  }

  static async getMentorMentees(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Faculty mentors must ONLY see their own mentees; super/program admin can optionally filter by query
      const mentorUserId = req.user?.role === 'FACULTY_MENTOR' 
        ? req.user.id 
        : (req.query.mentorId as string || req.user?.id);

      if (!mentorUserId) {
        res.status(400).json({ error: 'Mentor user ID required.' });
        return;
      }
      const mentees = await adminService.getMentorMentees(mentorUserId);
      res.json(mentees);
    } catch (error: any) {
      next(error);
    }
  }

  static async getTrainerTenures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenures = await adminService.getTrainerTenures(req.user ? { id: req.user.id, role: req.user.role } : undefined);
      res.json(tenures);
    } catch (error: any) {
      next(error);
    }
  }

  static async onboardTrainer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { trainerName, trainerEmail, companyOrInstitute, domainName, startDate, endDate } = req.body;
      if (!trainerName || !trainerEmail || !domainName || !startDate || !endDate) {
        res.status(400).json({ error: 'trainerName, trainerEmail, domainName, startDate, and endDate are required.' });
        return;
      }
      const tenure = await adminService.onboardTrainer({
        trainerName,
        trainerEmail,
        companyOrInstitute: companyOrInstitute || 'Visiting Expert',
        domainName,
        startDate,
        endDate
      }, req.user?.id);
      res.status(201).json(tenure);
    } catch (error: any) {
      next(error);
    }
  }

  static async revokeTrainer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenureId = req.params.id as string;
      const revokedBy = req.user?.id;
      await adminService.revokeTrainerTenure(tenureId, revokedBy);
      res.json({ message: 'Trainer tenure successfully revoked.', isActive: false });
    } catch (error: any) {
      next(error);
    }
  }

  static async getAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignments = await adminService.getAssignments();
      res.json(assignments);
    } catch (error: any) {
      next(error);
    }
  }

  static async createAssignment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, targetDomainOrTrack, domainId, dueDate, isMandatory } = req.body;
      const assignedById = req.user?.id || 'demo-admin-id';
      const assignedByRole = (req.user?.role as any) || 'PROGRAM_ADMIN';

      if (!title || !targetDomainOrTrack || !dueDate) {
        res.status(400).json({ error: 'title, targetDomainOrTrack, and dueDate are required.' });
        return;
      }

      const assignment = await adminService.createAssignment({
        title,
        assignedById,
        assignedByRole,
        targetDomainOrTrack,
        domainId,
        dueDate,
        isMandatory
      });
      res.status(201).json(assignment);
    } catch (error: any) {
      next(error);
    }
  }

  static async getPepDomains(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const domains = await adminService.getPepDomains();
      res.json(domains);
    } catch (error: any) {
      next(error);
    }
  }
}
