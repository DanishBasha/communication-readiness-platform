import { Router } from 'express';
import multer from 'multer';
import { StudentController } from '../controllers/StudentController';
import { authenticate } from '../middleware/auth';

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.get('/me', authenticate, StudentController.getProfile);
router.get('/:id', StudentController.getProfile);
router.put('/:id/coding-handles', authenticate, StudentController.updateCodingHandles);
router.post('/:id/resume', upload.single('resume'), StudentController.uploadResume);

export default router;
