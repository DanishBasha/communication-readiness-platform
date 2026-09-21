import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.post('/:studentId/toggle/:taskId', TaskController.toggleTask);
router.post('/:studentId/verify/:taskId', authenticate, requireRole('FACULTY_MENTOR', 'PLACEMENT_COORDINATOR'), TaskController.verifyTask);
router.post('/import-csv', authenticate, requireRole('PLACEMENT_COORDINATOR'), TaskController.importTasksCsv);

export default router;
