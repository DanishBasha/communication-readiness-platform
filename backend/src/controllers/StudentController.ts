import { Request, Response, NextFunction } from 'express';
import { StudentService } from '../services/StudentService';
import { ResumeParserService } from '../services/ResumeParserService';
import { ModelFactory } from '../adapters/models/ModelFactory';
import { ParsedResume } from '../types';

const studentService = new StudentService();
const resumeParser = new ResumeParserService(ModelFactory.getModelAdapter());

export class StudentController {
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = (req.params.id === 'me' || !req.params.id) ? req.user?.id : (req.params.id as string);
      if (!studentId) {
        res.status(400).json({ error: 'Student ID or authenticated session required.' });
        return;
      }
      const profile = await studentService.getStudentProfile(studentId);
      res.json(profile);
    } catch (error: any) {
      next(error);
    }
  }

  static async updateCodingHandles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.params.id as string;
      const handles = req.body;
      await studentService.updateCodingHandles(studentId, handles);
      res.json({ message: 'Coding handles updated successfully.' });
    } catch (error: any) {
      next(error);
    }
  }

  static async uploadResume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = (req.params.id === 'me' || !req.params.id) ? req.user?.id : (req.params.id as string);
      if (!studentId) {
        res.status(400).json({ error: 'Student ID required.' });
        return;
      }

      let parsedResume: ParsedResume;
      let rawText = '';

      if (req.body && req.body.skills && Array.isArray(req.body.projects)) {
        parsedResume = req.body as ParsedResume;
        rawText = JSON.stringify(parsedResume);
      } else {
        const fileName = req.file ? req.file.originalname : (req.body.fileName || 'Candidate_Resume.pdf');
        const fileBuffer = req.file?.buffer;
        const pastedText = req.body.resumeText;

        const result = await resumeParser.parseResume(fileName, fileBuffer, pastedText);
        parsedResume = result.parsedResume;
        rawText = result.rawText;
      }

      await studentService.saveParsedResume(studentId, parsedResume, rawText);
      res.json({ message: 'Resume uploaded and parsed successfully.', resume: parsedResume });
    } catch (error: any) {
      next(error);
    }
  }
}
