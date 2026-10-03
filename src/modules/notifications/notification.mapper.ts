import type { Notification } from '@prisma/client';
import type { NotificationResponseDTO } from './notification.dto';

export function toNotificationDTO(notification: Notification): NotificationResponseDTO {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    read: notification.readAt !== null,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    data: (notification.data as Record<string, unknown>) ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}
