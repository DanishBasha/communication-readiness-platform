import { ErrorRequestHandler } from 'express';
import { AppError } from '../shared/errors/AppError';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      code: err.code,
    });
    return;
  }
  // body-parser / express.json() sends a SyntaxError with statusCode 400 for malformed JSON
  const httpStatus = (err as { status?: number; statusCode?: number }).status
    ?? (err as { status?: number; statusCode?: number }).statusCode;
  if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
    res.status(httpStatus).json({
      status: 'error',
      message: (err as Error).message || 'Bad request',
      code: 'BAD_REQUEST',
    });
    return;
  }
  console.error(err);
  res.status(500).json({ status: 'error', message: 'Internal server error', code: 'INTERNAL_ERROR' });
};
