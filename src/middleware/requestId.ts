import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../core/logger/logger';
import type { Logger } from 'pino';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      log?: Logger;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  req.log = logger.child({ reqId });
  next();
}
