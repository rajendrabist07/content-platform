import { updateProfileSchema } from '../../modules/users/user.validation';
import { body, envelope, commonErrors } from '../helpers';

export const usersSchemas = {
  UserProfile: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cmucki5fs0001043rqx88trvo' },
      email: { type: 'string', format: 'email', example: 'rajendra@example.com' },
      name: { type: 'string', example: 'Rajendra Bist' },
      role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'], example: 'MEMBER' },
      emailVerified: { type: 'boolean', example: true },
      emailNotifications: { type: 'boolean', example: true },
      bio: { type: 'string', nullable: true, example: 'Backend engineer & distributed systems enthusiast.' },
      avatarUrl: { type: 'string', nullable: true, example: 'https://example.com/avatar.jpg' },
      createdAt: { type: 'string', format: 'date-time', example: '2026-10-03T12:00:00.000Z' },
    },
  },
  LikeResponse: {
    type: 'object',
    properties: {
      liked: { type: 'boolean', example: true },
      likeCount: { type: 'integer', example: 5 },
    },
  },
  BookmarkResponse: {
    type: 'object',
    properties: {
      bookmarked: { type: 'boolean', example: true },
    },
  },
};

export const usersPaths = {
  '/users/me': {
    get: {
      tags: ['Users'],
      summary: 'Get current user profile and preferences',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': envelope({ $ref: '#/components/schemas/UserProfile' }, 'User profile'),
        '401': commonErrors.unauthorized(),
      },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update current user profile and notification preferences',
      security: [{ bearerAuth: [] }],
      requestBody: body(updateProfileSchema, {
        name: 'Rajendra Bist',
        bio: 'Backend engineer & distributed systems enthusiast.',
        avatarUrl: 'https://example.com/avatar.jpg',
        emailNotifications: true,
      }),
      responses: {
        '200': envelope({ $ref: '#/components/schemas/UserProfile' }, 'Updated user profile'),
        '400': commonErrors.validation(),
        '401': commonErrors.unauthorized(),
      },
    },
  },
  '/bookmarks': {
    get: {
      tags: ['Users'],
      summary: 'List bookmarked posts for authenticated user',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
      ],
      responses: {
        '200': {
          description: 'Bookmarked posts',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Post' },
                  },
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
};
