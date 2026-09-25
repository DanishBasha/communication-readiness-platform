import { Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ status: 'success', data });
}

export function sendError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
      code: error.code,
    });
    return;
  }
  if (error instanceof ZodError) {
    res.status(422).json({ status: 'error', message: 'Validation failed', code: 'VALIDATION_ERROR' });
    return;
  }
  // Safe-log: util.inspect can crash on certain objects in Node v24 (e.g. ZodError)
  try { console.error(error); } catch { console.error('[sendError] unloggable error object'); }
  res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
}
