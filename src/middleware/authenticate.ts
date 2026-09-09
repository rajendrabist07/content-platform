import type { Request, Response, NextFunction } from 'express';
import { authService } from '../modules/auth/auth.service';
import { UnauthorizedError } from '../core/errors/HttpError';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing');
    }


    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }


    const payload = authService.verifyToken(token);


    req.user = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      role: payload.role,
    };

    next(); 
  } catch (err) {
    next(err); 
  }
}