import type { Prisma, Notification } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class NotificationRepository {
  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  async findMany(
    userId: string,
    pagination: { page: number; limit: number },
    unreadOnly?: boolean
  ): Promise<{ data: Notification[]; total: number }> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const skip = (pagination.page - 1) * pagination.limit;
    const take = pagination.limit;

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { data, total };
  }

  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({ where: { id } });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return result.count;
  }
}

export const notificationRepository = new NotificationRepository();
