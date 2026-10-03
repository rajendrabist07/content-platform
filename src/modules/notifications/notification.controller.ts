import type { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import { toNotificationDTO } from './notification.mapper';
import { UnauthorizedError, ValidationError } from '../../core/errors/HttpError';

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationService.getNotifications(
        req.user.userId,
        page,
        limit,
        unreadOnly
      );

      res.status(200).json({
        success: true,
        data: result.data.map(toNotificationDTO),
        unreadCount: result.unreadCount,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async unreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const count = await notificationService.getUnreadCount(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          unreadCount: count,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const notificationId = req.params.id;
      if (!notificationId || typeof notificationId !== 'string') {
        throw new ValidationError('Notification ID is required in URL');
      }

      const updated = await notificationService.markAsRead(notificationId, req.user.userId);

      res.status(200).json({
        success: true,
        data: toNotificationDTO(updated),
      });
    } catch (err) {
      next(err);
    }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { count } = await notificationService.markAllAsRead(req.user.userId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: {
          markedCount: count,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
