import type { Request, Response, NextFunction } from 'express';
import { moderationService } from './moderation.service';
import { rejectPostSchema, setTrustLevelSchema, suspendUserSchema } from './moderation.validation';
import { updateReportSchema } from '../reports/report.validation';
import { toPostDTO } from '../posts/post.mapper';
import { toReportDTO } from '../reports/report.mapper';
import { toUserDTO } from '../auth/auth.mapper';
import { ValidationError, UnauthorizedError } from '../../core/errors/HttpError';

export class ModerationController {
  async getQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      const queue = await moderationService.getModerationQueue(page, limit);
      res.status(200).json({ success: true, data: queue });
    } catch (err) {
      next(err);
    }
  }

  async approvePost(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = req.params.id as string;
      if (!id) throw new ValidationError('Post id is required');

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const post = await moderationService.approvePost(id, req.user.userId, context);

      res.status(200).json({
        success: true,
        message: 'Post approved and published successfully',
        data: toPostDTO(post),
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectPost(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = req.params.id as string;
      if (!id) throw new ValidationError('Post id is required');

      const result = rejectPostSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const post = await moderationService.rejectPost(id, req.user.userId, result.data.reason, context);

      res.status(200).json({
        success: true,
        message: 'Post rejected',
        data: toPostDTO(post),
      });
    } catch (err) {
      next(err);
    }
  }

  async unpublishPost(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = req.params.id as string;
      if (!id) throw new ValidationError('Post id is required');

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const post = await moderationService.unpublishPost(id, req.user.userId, context);

      res.status(200).json({
        success: true,
        message: 'Post unpublished',
        data: toPostDTO(post),
      });
    } catch (err) {
      next(err);
    }
  }

  async updateReport(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = req.params.id as string;
      if (!id) throw new ValidationError('Report id is required');

      const result = updateReportSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const report = await moderationService.updateReport(id, req.user.userId, result.data, context);

      res.status(200).json({
        success: true,
        message: 'Report updated successfully',
        data: toReportDTO(report),
      });
    } catch (err) {
      next(err);
    }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = req.params.id as string;
      if (!id) throw new ValidationError('User id is required');

      const result = suspendUserSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      await moderationService.suspendUser(id, req.user.userId, result.data.reason, context);

      res.status(200).json({
        success: true,
        message: 'User account has been suspended and sessions revoked',
      });
    } catch (err) {
      next(err);
    }
  }

  async restoreUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = req.params.id as string;
      if (!id) throw new ValidationError('User id is required');

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      await moderationService.restoreUser(id, req.user.userId, context);

      res.status(200).json({
        success: true,
        message: 'User account restored to ACTIVE status',
      });
    } catch (err) {
      next(err);
    }
  }

  async setUserTrustLevel(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const id = req.params.id as string;
      if (!id) throw new ValidationError('User id is required');

      const result = setTrustLevelSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const user = await moderationService.setUserTrustLevel(id, req.user.userId, result.data.trustLevel, context);

      res.status(200).json({
        success: true,
        message: `User trust level updated to ${result.data.trustLevel}`,
        data: toUserDTO(user),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const moderationController = new ModerationController();
