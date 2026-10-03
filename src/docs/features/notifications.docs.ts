import { envelope, messageOnly, commonErrors } from '../helpers';

export const notificationsSchemas = {
  NotificationItem: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cmu123notification' },
      type: {
        type: 'string',
        enum: ['NEW_COMMENT', 'NEW_REPLY', 'POST_PUBLISHED', 'SYSTEM'],
        example: 'NEW_COMMENT',
      },
      title: { type: 'string', example: 'New comment on "Scaling Node.js"' },
      body: { type: 'string', example: 'Jane Doe commented on your post.' },
      read: { type: 'boolean', example: false },
      readAt: { type: 'string', format: 'date-time', nullable: true, example: null },
      data: {
        type: 'object',
        nullable: true,
        example: { postId: 'post-123', commentId: 'comment-456' },
      },
      createdAt: { type: 'string', format: 'date-time', example: '2026-10-03T12:00:00.000Z' },
    },
  },
  UnreadCountResponse: {
    type: 'object',
    properties: {
      unreadCount: { type: 'integer', example: 3 },
    },
  },
};

export const notificationsPaths = {
  '/notifications': {
    get: {
      tags: ['Notifications'],
      summary: 'List user notifications with pagination',
      description: 'Returns notifications for the authenticated user, optionally filtered to unread items only.',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 },
          description: 'Page number',
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20 },
          description: 'Number of notifications per page (max 50)',
        },
        {
          name: 'unreadOnly',
          in: 'query',
          schema: { type: 'boolean', default: false },
          description: 'Filter only unread notifications',
        },
      ],
      responses: {
        '200': {
          description: 'Notifications list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/NotificationItem' },
                  },
                  unreadCount: { type: 'integer', example: 3 },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
        '401': commonErrors.unauthorized(),
      },
    },
  },
  '/notifications/unread-count': {
    get: {
      tags: ['Notifications'],
      summary: 'Get total unread notification count',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': envelope({ $ref: '#/components/schemas/UnreadCountResponse' }, 'Unread count'),
        '401': commonErrors.unauthorized(),
      },
    },
  },
  '/notifications/{id}/read': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark single notification as read',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Notification ID',
        },
      ],
      responses: {
        '200': envelope({ $ref: '#/components/schemas/NotificationItem' }, 'Notification marked read'),
        '401': commonErrors.unauthorized(),
        '404': commonErrors.notFound('Notification'),
      },
    },
  },
  '/notifications/read-all': {
    patch: {
      tags: ['Notifications'],
      summary: 'Mark all notifications as read',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': messageOnly('All notifications marked as read'),
        '401': commonErrors.unauthorized(),
      },
    },
  },
};
