import { Router } from 'express';
import { InterviewController } from '../controllers/InterviewController';

const router = Router();

router.post('/start', InterviewController.startInterview);
router.post('/:id/proctor-event', InterviewController.recordProctorEvent);
router.post('/:id/submit-answer', InterviewController.submitAnswer);
router.post('/:id/finalize', InterviewController.finalizeInterview);
router.get('/:id/report', InterviewController.getReport);

export default router;
