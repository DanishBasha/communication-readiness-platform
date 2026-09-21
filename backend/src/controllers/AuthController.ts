import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

const authService = new AuthService();

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, role, rollNumber, department, batchYear, track, domainName } = req.body;
      if (!name || !email || !password || !role) {
        res.status(400).json({ error: 'Name, email, password, and role are required.' });
        return;
      }
      const result = await authService.register({
        name,
        email,
        password,
        role,
        rollNumber,
        department,
        batchYear,
        track,
        domainName
      });
      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  }

  static async registerExternal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, department, batchYear } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: 'Name, email, and password are required.' });
        return;
      }
      const result = await authService.registerExternalStudent({
        name,
        email,
        password,
        department,
        batchYear: batchYear ? Number(batchYear) : undefined
      });
      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
        return;
      }
      const result = await authService.verifyEmailCode(email, code);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }
      const result = await authService.login(email, password);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }
      const result = await authService.getMe(req.user.id);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
}
