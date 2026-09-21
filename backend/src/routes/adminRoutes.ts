import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.get('/coordinator-stats', authenticate, AdminController.getCoordinatorStats);
router.get('/system-stats', authenticate, requireRole('SUPER_ADMIN', 'PROGRAM_ADMIN'), AdminController.getSystemStats);

// Super Admin hierarchy routes
router.post('/program-admins', authenticate, requireRole('SUPER_ADMIN'), AdminController.createProgramAdmin);
router.get('/program-admins', authenticate, requireRole('SUPER_ADMIN'), AdminController.getProgramAdmins);

// Program Admin hierarchy routes
router.post('/faculty-mentors', authenticate, requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'), AdminController.createFacultyMentor);
router.get('/faculty-mentors', authenticate, requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'), AdminController.getFacultyMentors);
router.post('/assign-mentor', authenticate, requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'), AdminController.assignMentor);

// Student creation & mentees (Faculty Mentor, Program Admin, Super Admin)
router.post('/create-student', authenticate, requireRole('FACULTY_MENTOR', 'PROGRAM_ADMIN', 'SUPER_ADMIN'), AdminController.createStudent);
router.get('/mentees', authenticate, requireRole('FACULTY_MENTOR', 'PROGRAM_ADMIN', 'SUPER_ADMIN'), AdminController.getMentorMentees);

// User removal & student full history inspector
router.delete('/users/:id', authenticate, requireRole('SUPER_ADMIN', 'PROGRAM_ADMIN', 'FACULTY_MENTOR'), AdminController.deleteUser);
router.get('/students/:id/full-history', authenticate, AdminController.getStudentFullHistory);

// Student listing & Trainer tenures
router.get('/students', authenticate, AdminController.getStudents);
router.get('/trainer-tenures', authenticate, AdminController.getTrainerTenures);
router.post('/onboard-trainer', authenticate, requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'), AdminController.onboardTrainer);
router.put('/revoke-trainer/:id', authenticate, requireRole('PROGRAM_ADMIN', 'SUPER_ADMIN'), AdminController.revokeTrainer);

// Practice Assignment matrix (Trainers, Program Admins)
router.get('/assignments', authenticate, AdminController.getAssignments);
router.post('/assignments', authenticate, requireRole('PROGRAM_ADMIN', 'PLACEMENT_COORDINATOR', 'TRAINER', 'SUPER_ADMIN'), AdminController.createAssignment);
router.get('/pep-domains', AdminController.getPepDomains);

export default router;
