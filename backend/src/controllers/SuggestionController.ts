import { Request, Response, NextFunction } from 'express';
import { SuggestionService } from '../services/SuggestionService';
import { SuggestionConversationAgent } from '../agents/SuggestionConversationAgent';
import { SuggestionEvaluationAgent } from '../agents/SuggestionEvaluationAgent';
import { ModelFactory } from '../adapters/models/ModelFactory';

const modelAdapter = ModelFactory.getModelAdapter();
const conversationAgent = new SuggestionConversationAgent(modelAdapter);
const evaluationAgent = new SuggestionEvaluationAgent(modelAdapter);
const suggestionService = new SuggestionService(conversationAgent, evaluationAgent);

export class SuggestionController {
  static async getOrCreateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = (req.params.studentId as string) || req.user?.id;
      if (!studentId) {
        res.status(400).json({ error: 'Student ID is required.' });
        return;
      }
      const sessionId = await suggestionService.getOrCreateSession(studentId);
      res.json({ sessionId });
    } catch (error: any) {
      next(error);
    }
  }

  static async getChatHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const history = await suggestionService.getChatHistory(sessionId);
      res.json(history);
    } catch (error: any) {
      next(error);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const { message } = req.body;
      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Message content is required.' });
        return;
      }
      const result = await suggestionService.processMessage(sessionId, message.trim());
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
}
