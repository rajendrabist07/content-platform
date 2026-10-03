import type { Request, Response, NextFunction } from 'express';
import { handleError } from '../core/errors/errorHandler';
import { logger } from '../core/logger/logger';

export function errorMiddleware(err: unknown, req: Request, res: Response, next: NextFunction) {
  const response = handleError(err, req.log || logger);
  res.status(response.statusCode).json(response);
}