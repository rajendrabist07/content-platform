import type { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';
import {
  suggestContentSchema,
  improveContentSchema,
  outlineContentSchema,
} from './ai.validation';
import { ValidationError, UnauthorizedError } from '../../core/errors/HttpError';

export class AiController {
  async suggest(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = suggestContentSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const data = await aiService.generateSuggestions(result.data);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async improve(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = improveContentSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const data = await aiService.improveContent(result.data);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async outline(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = outlineContentSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const data = await aiService.generateOutline(result.data);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AiController();
