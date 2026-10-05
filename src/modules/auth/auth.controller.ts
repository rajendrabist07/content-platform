import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resendVerificationSchema,
} from './auth.validation';
import { toUserDTO } from './auth.mapper';
import { ValidationError, UnauthorizedError } from '../../core/errors/HttpError';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const { user, accessToken, refreshToken } = await authService.register(result.data, context);

      res.status(201).json({
        success: true,
        data: {
          user: toUserDTO(user),
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

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const { user, accessToken, refreshToken } = await authService.login(result.data, context);

      res.status(200).json({
        success: true,
        data: {
          user: toUserDTO(user),
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const token = (req.query.token as string) || req.body?.token;
      if (!token || typeof token !== 'string') {
        throw new ValidationError('Verification token is required');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const user = await authService.verifyEmail(token, context);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: toUserDTO(user),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const result = resendVerificationSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      await authService.resendVerification(result.data.email, context);

      res.status(200).json({
        success: true,
        message: 'If your email is registered and unverified, a verification link has been sent.',
      });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = forgotPasswordSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      await authService.forgotPassword(result.data.email, context);

      res.status(200).json({
        success: true,
        message: 'If your email is registered, a password reset link has been sent.',
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = resetPasswordSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      await authService.resetPassword(result.data, context);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. Please log in with your new password.',
      });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = changePasswordSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      await authService.changePassword(req.user.userId, result.data, context);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please log in with your new password.',
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

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const { accessToken } = await authService.refreshAccessToken(refreshToken, context);

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

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const user = await authService.findUserById(req.user.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      res.status(200).json({
        success: true,
        data: toUserDTO(user),
      });
    } catch (err) {
      next(err);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const currentRefreshToken =
        (req.headers['x-refresh-token'] as string) || (req.query.refreshToken as string) || undefined;
      const sessions = await authService.listSessions(req.user.userId, currentRefreshToken);

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (err) {
      next(err);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const id = req.params.id as string;
      if (!id) {
        throw new ValidationError('Session ID is required');
      }

      await authService.revokeSession(req.user.userId, id);

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async revokeAllOtherSessions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const currentRefreshToken =
        req.body?.refreshToken || (req.headers['x-refresh-token'] as string) || undefined;
      const result = await authService.revokeAllOtherSessions(req.user.userId, currentRefreshToken);

      res.status(200).json({
        success: true,
        message: `Revoked ${result.revokedCount} other session(s)`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();