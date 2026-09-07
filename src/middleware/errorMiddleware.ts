import { Request, Response, NextFunction } from 'express';
import { handleError } from '../core/errors/errorHandler';

export function errorMiddleware(err: unknown, req: Request, res: Response, next: NextFunction) {
  const response = handleError(err);  
  res.status(response.statusCode).json(response);
}