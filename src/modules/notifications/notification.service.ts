import { type NotificationType, Prisma } from '@prisma/client';
import { notificationRepository } from './notification.repository';
import { prisma } from '../../lib/prisma';
import { emailService } from '../email/email.service';
import { NotFoundError } from '../../core/errors/HttpError';
import { logger } from '../../core/logger/logger';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
  actionUrl?: string;
}

export class NotificationService {
  async createNotification(params: CreateNotificationParams) {
    const notification = await notificationRepository.create({
      user: { connect: { id: params.userId } },
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data ?? Prisma.JsonNull,
    });

    logger.info({ notificationId: notification.id, userId: params.userId, type: params.type }, 'Notification created');

    // Asynchronously dispatch email if user enabled email notifications
    prisma.user
      .findUnique({
        where: { id: params.userId },
        select: { email: true, name: true, emailNotifications: true },
      })
      .then((user) => {
        if (user && user.emailNotifications) {
          emailService
            .sendNotificationEmail(user.email, user.name, params.title, params.body, params.actionUrl)
            .catch((err) =>
              logger.error({ err, userId: params.userId }, 'Failed to dispatch notification email')
            );
        }
      })
      .catch((err) =>
        logger.error({ err, userId: params.userId }, 'Failed to fetch user preferences for email notification')
      );

    return notification;
  }

  async getNotifications(userId: string, rawPage?: number, rawLimit?: number, unreadOnly?: boolean) {
    const page = this.sanitizePage(rawPage);
    const limit = this.sanitizeLimit(rawLimit);

    const [{ data, total }, unreadCount] = await Promise.all([
      notificationRepository.findMany(userId, { page, limit }, unreadOnly),
      notificationRepository.countUnread(userId),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundError('Notification');
    }

    if (notification.readAt) {
      return notification;
    }

    return notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const count = await notificationRepository.markAllAsRead(userId);
    return { count };
  }

  private sanitizePage(rawPage?: number): number {
    if (!rawPage || !Number.isInteger(rawPage) || rawPage < 1) {
      return DEFAULT_PAGE;
    }
    return rawPage;
  }

  private sanitizeLimit(rawLimit?: number): number {
    if (!rawLimit || !Number.isInteger(rawLimit) || rawLimit < 1) {
      return DEFAULT_LIMIT;
    }
    if (rawLimit > MAX_LIMIT) {
      return MAX_LIMIT;
    }
    return rawLimit;
  }
}

export const notificationService = new NotificationService();
