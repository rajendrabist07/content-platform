export interface NotificationResponseDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  readAt: string | null;
  data?: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationListResponseDTO {
  notifications: NotificationResponseDTO[];
  unreadCount: number;
}
