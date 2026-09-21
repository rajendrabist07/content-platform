import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { registerSchema, loginSchema } from './auth.validation';
import { ValidationError, UnauthorizedError } from '../../core/errors/HttpError';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const { user, accessToken, refreshToken } = await authService.register(result.data);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const { user, accessToken, refreshToken } = await authService.login(result.data);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken;
      if (typeof refreshToken !== 'string' || !refreshToken) {
        throw new ValidationError('refreshToken is required');
      }

      const { accessToken } = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({ success: true, data: { accessToken } });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken;
      if (typeof refreshToken !== 'string' || !refreshToken) {
        throw new ValidationError('refreshToken is required');
      }

      await authService.logout(refreshToken);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();