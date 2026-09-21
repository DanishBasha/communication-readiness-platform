import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/register-external', AuthController.registerExternal);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.me);

export default router;
