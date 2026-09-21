import { Request, Response, NextFunction } from 'express';
import { InterviewService } from '../services/InterviewService';
import { InterviewAgent } from '../agents/InterviewAgent';
import { ContextBuilder } from '../rag/ContextBuilder';
import { InMemoryVectorStore } from '../adapters/vector/InMemoryVectorStore';
import { ModelFactory } from '../adapters/models/ModelFactory';
import { SpeechMetricsEngine } from '../adapters/speech/SpeechMetricsEngine';

const modelAdapter = ModelFactory.getModelAdapter();
const vectorStore = new InMemoryVectorStore();
const contextBuilder = new ContextBuilder(vectorStore);
const interviewAgent = new InterviewAgent(modelAdapter, contextBuilder);
const speechEngine = new SpeechMetricsEngine();
const interviewService = new InterviewService(interviewAgent, contextBuilder, speechEngine);

export class InterviewController {
  static async startInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.body.studentId || req.user?.id;
      const sessionType = req.body.sessionType || 'MOCK_INTERVIEW';
      const assignmentId = req.body.assignmentId;

      if (!studentId) {
        res.status(400).json({ error: 'Student ID required to start interview.' });
        return;
      }

      const result = await interviewService.startInterviewSession(studentId, sessionType, assignmentId);
      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  }

  static async recordProctorEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id as string;
      const eventType = (req.body.eventType || 'TAB_SWITCH') as 'TAB_SWITCH' | 'FULLSCREEN_EXIT';
      const result = await interviewService.recordProctorEvent(sessionId, eventType);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  static async submitAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id as string;
      const { studentAnswer, estimatedDurationSeconds } = req.body;

      if (!studentAnswer) {
        res.status(400).json({ error: 'studentAnswer is required.' });
        return;
      }

      const result = await interviewService.submitTurnAnswer(sessionId, studentAnswer, estimatedDurationSeconds);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  static async finalizeInterview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id as string;
      const report = await interviewService.finalizeInterview(sessionId);
      res.json(report);
    } catch (error: any) {
      next(error);
    }
  }

  static async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.id as string;
      const report = await interviewService.getReport(sessionId);
      if (!report) {
        res.status(404).json({ error: 'Diagnostic report not found for this session.' });
        return;
      }
      res.json(report);
    } catch (error: any) {
      next(error);
    }
  }
}
