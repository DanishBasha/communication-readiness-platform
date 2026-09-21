import { Router } from 'express';
import { ListeningController } from '../controllers/ListeningController';

const router = Router();

router.post('/start', ListeningController.startSession);
router.post('/:id/replay', ListeningController.recordReplay);
router.post('/:id/submit', ListeningController.submitAnswers);

export default router;
