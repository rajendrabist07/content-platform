import { envelope, commonErrors } from '../helpers';

export const auditSchemas = {
  AuditLog: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cmuaudit123456789' },
      organizationId: { type: 'string', nullable: true, example: 'test-org-123' },
      userId: { type: 'string', nullable: true, example: 'cmusgqy9l002504czh4mqlrvk' },
      action: { type: 'string', example: 'AUTH_LOGIN_SUCCESS' },
      resource: { type: 'string', nullable: true, example: 'User' },
      resourceId: { type: 'string', nullable: true, example: 'cmusgqy9l002504czh4mqlrvk' },
      ipAddress: { type: 'string', nullable: true, example: '127.0.0.1' },
      userAgent: { type: 'string', nullable: true, example: 'Mozilla/5.0' },
      metadata: { type: 'object', nullable: true, example: { email: 'user@example.com' } },
      createdAt: { type: 'string', format: 'date-time', example: '2026-10-03T12:00:00.000Z' },
    },
  },
};

export const auditPaths = {
  '/audit-logs': {
    get: {
      tags: ['Audit'],
      summary: 'List security and lifecycle audit logs (OWNER or ADMIN only)',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'action', in: 'query', schema: { type: 'string' }, description: 'Filter by action name' },
        { name: 'userId', in: 'query', schema: { type: 'string' }, description: 'Filter by user ID' },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': {
          description: 'Paginated audit log entries',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/AuditLog' },
                  },
                  pagination: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
      },
    },
  },
};
