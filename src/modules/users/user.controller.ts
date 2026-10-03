import type { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { updateProfileSchema } from './user.validation';
import { toUserProfileDTO } from './user.mapper';
import { UnauthorizedError, ValidationError } from '../../core/errors/HttpError';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const user = await userService.getProfile(req.user.userId);

      res.status(200).json({
        success: true,
        data: toUserProfileDTO(user),
      });
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const updatedUser = await userService.updateProfile(req.user.userId, result.data);

      res.status(200).json({
        success: true,
        data: toUserProfileDTO(updatedUser),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
