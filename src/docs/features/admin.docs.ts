import { body, envelope, commonErrors } from '../helpers';
import {
  rejectPostSchema,
  setTrustLevelSchema,
  suspendUserSchema,
} from '../../modules/moderation/moderation.validation';
import { updateReportSchema } from '../../modules/reports/report.validation';

export const adminSchemas = {
  ModerationQueueResponse: {
    type: 'object',
    properties: {
      pendingPosts: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/PostResponse' } },
          total: { type: 'integer', example: 3 },
        },
      },
      openReports: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/ReportResponse' } },
          total: { type: 'integer', example: 2 },
        },
      },
    },
  },
};

export const adminPaths = {
  '/admin/moderation/queue': {
    get: {
      tags: ['Admin Moderation'],
      summary: 'List pending posts and open reports in moderation queue',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
      ],
      responses: {
        '200': envelope({ $ref: '#/components/schemas/ModerationQueueResponse' }, 'Queue items returned'),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
      },
    },
  },
  '/admin/posts/{id}/approve': {
    post: {
      tags: ['Admin Moderation'],
      summary: 'Approve and publish a pending review post',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': envelope({ $ref: '#/components/schemas/PostResponse' }, 'Post approved and published'),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
        '404': commonErrors.notFound('Post'),
      },
    },
  },
  '/admin/posts/{id}/reject': {
    post: {
      tags: ['Admin Moderation'],
      summary: 'Reject a pending post with reason',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: body(rejectPostSchema),
      responses: {
        '200': envelope({ $ref: '#/components/schemas/PostResponse' }, 'Post rejected'),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
        '404': commonErrors.notFound('Post'),
      },
    },
  },
  '/admin/posts/{id}/unpublish': {
    post: {
      tags: ['Admin Moderation'],
      summary: 'Unpublish a post back to DRAFT',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': envelope({ $ref: '#/components/schemas/PostResponse' }, 'Post unpublished'),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
        '404': commonErrors.notFound('Post'),
      },
    },
  },
  '/admin/reports/{id}': {
    patch: {
      tags: ['Admin Moderation'],
      summary: 'Update / resolve a moderation report',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: body(updateReportSchema),
      responses: {
        '200': envelope({ $ref: '#/components/schemas/ReportResponse' }, 'Report status updated'),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
        '404': commonErrors.notFound('Report'),
      },
    },
  },
  '/admin/users/{id}/suspend': {
    post: {
      tags: ['Admin Moderation'],
      summary: 'Suspend user account and revoke sessions',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: body(suspendUserSchema),
      responses: {
        '200': envelope({ type: 'object' }, 'User suspended'),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
        '404': commonErrors.notFound('User'),
      },
    },
  },
  '/admin/users/{id}/restore': {
    post: {
      tags: ['Admin Moderation'],
      summary: 'Restore a suspended user account to ACTIVE',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        '200': envelope({ type: 'object' }, 'User restored'),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
        '404': commonErrors.notFound('User'),
      },
    },
  },
  '/admin/users/{id}/set-trust-level': {
    post: {
      tags: ['Admin Moderation'],
      summary: 'Update a user trust level',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: body(setTrustLevelSchema),
      responses: {
        '200': envelope({ $ref: '#/components/schemas/UserResponse' }, 'User trust level updated'),
        '401': commonErrors.unauthorized(),
        '403': commonErrors.forbidden(),
        '404': commonErrors.notFound('User'),
      },
    },
  },
};
