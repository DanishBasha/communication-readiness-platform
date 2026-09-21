import { Router } from 'express';
import { SuggestionController } from '../controllers/SuggestionController';

const router = Router();

router.post('/session/:studentId', SuggestionController.getOrCreateSession);
router.get('/:sessionId/history', SuggestionController.getChatHistory);
router.post('/:sessionId/chat', SuggestionController.sendMessage);

export default router;
