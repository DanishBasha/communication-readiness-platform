import { Request, Response, NextFunction } from 'express';
import { ListeningService } from '../services/ListeningService';
import { ModelFactory } from '../adapters/models/ModelFactory';

const modelAdapter = ModelFactory.getModelAdapter();
const listeningService = new ListeningService(modelAdapter);

export class ListeningController {
  static async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.body.studentId || req.user?.id;
      if (!studentId) {
        res.status(400).json({ error: 'Student ID is required.' });
        return;
      }
      const result = await listeningService.startSession(studentId);
      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  }

  static async recordReplay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id as string;
      const replaysUsed = await listeningService.recordReplay(sessionId);
      res.json({ replaysUsed });
    } catch (error: any) {
      next(error);
    }
  }

  static async submitAnswers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id as string;
      const { answers } = req.body;
      if (!Array.isArray(answers) || answers.length === 0) {
        res.status(400).json({ error: 'Array of answers is required.' });
        return;
      }
      const result = await listeningService.submitAnswers(sessionId, answers);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
}
