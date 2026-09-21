import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/TaskService';

const taskService = new TaskService();

export class TaskController {
  static async toggleTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId as string;
      const taskId = req.params.taskId as string;
      const isCompleted = await taskService.toggleTaskCompleted(studentId, taskId);
      res.json({ isCompleted });
    } catch (error: any) {
      next(error);
    }
  }

  static async verifyTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.studentId as string;
      const taskId = req.params.taskId as string;
      const mentorUserId = req.user?.id || 'demo-mentor-id';
      await taskService.verifyTaskByMentor(studentId, taskId, mentorUserId);
      res.json({ message: 'Criteria task successfully verified by mentor.', verified: true });
    } catch (error: any) {
      next(error);
    }
  }

  static async importTasksCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tasks } = req.body;
      if (!Array.isArray(tasks)) {
        res.status(400).json({ error: 'Array of tasks is required.' });
        return;
      }
      const count = await taskService.importCriteriaTasksFromCsv(tasks);
      res.json({ message: `Successfully imported ${count} criteria tasks.` });
    } catch (error: any) {
      next(error);
    }
  }
}
