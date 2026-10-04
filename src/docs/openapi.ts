import { authSchemas, authPaths } from './features/auth.docs';
import { postsSchemas, postsPaths } from './features/posts.docs';
import { commentsSchemas, commentsPaths } from './features/comments.docs';
import { tagsSchemas, tagsPaths } from './features/tags.docs';
import { aiSchemas, aiPaths } from './features/ai.docs';
import { notificationsSchemas, notificationsPaths } from './features/notifications.docs';
import { publicSchemas, publicPaths } from './features/public.docs';
import { usersSchemas, usersPaths } from './features/users.docs';
import { auditSchemas, auditPaths } from './features/audit.docs';

import { healthSchemas, healthPaths } from './features/health.docs';

export const openApiDocument = {
    openapi: '3.1.0',
    info: {
        title: 'Content Platform API',
        version: '1.0.0',
        description: `
Backend API for the Content Platform (Organizations, Users, Posts, Comments, Tags, Notifications, AI, Public SEO, Profiles, Engagement, Security & Audit Logs).

**Response envelope** — every response has the shape \`{ success, data?, message?, statusCode? }\`.

**Errors** — \`success: false\` with a human-readable \`message\` and matching HTTP status code:
400 (validation), 401 (authentication), 403 (authorization — ownership/role), 404 (not found,
including cross-organization access to avoid leaking existence), 409 (conflict/duplicate),
429 (rate limited), 500 (unexpected — generic message only, details are server-side logged),
503 (service unavailable — upstream AI failure).

**Authentication** — \`POST /auth/register\` and \`POST /auth/login\` return an \`accessToken\`
(15 min) and a \`refreshToken\` (30 days, DB-backed and revocable via \`POST /auth/logout\`).
Send \`Authorization: Bearer <accessToken>\` on every protected request.

**Authorization** — ownership-based (only the author of a Post/Comment can update/publish/delete
it) plus role-based (ADMIN/OWNER can act on any user's Post/Comment). Posts/Comments/Tags are
implicitly scoped to the caller's Organization, derived from the JWT — never from the request body.
    `.trim(),
    },
    servers: [{ url: '/api/v1', description: 'Current server' }],
    tags: [
        { name: 'Health', description: 'Liveness and readiness health checks with database and migration status' },
        { name: 'Public', description: 'Unauthenticated public read endpoints with caching and SEO sitemaps' },
        { name: 'Auth', description: 'Registration, login, email verification, password reset, token refresh, logout' },
        { name: 'Users', description: 'User profile management and bookmarks' },
        { name: 'Posts', description: 'Blog post CRUD, pagination, publishing, likes, bookmarks' },
        { name: 'Comments', description: 'Threaded comments on posts' },
        { name: 'Tags', description: 'Tag creation and many-to-many attachment to posts' },
        { name: 'Notifications', description: 'In-app notification listing and read status management' },
        { name: 'AI', description: 'AI-assisted content generation and optimization' },
        { name: 'Audit', description: 'Security event and compliance audit logs' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Access token from /auth/login or /auth/register, valid for 15 minutes.',
            },
        },
        schemas: {
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Post not found' },
                    statusCode: { type: 'integer', example: 404 },
                },
                required: ['success', 'message', 'statusCode'],
            },
            PaginationMeta: {
                type: 'object',
                properties: {
                    page: { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 10 },
                    total: { type: 'integer', example: 42 },
                    totalPages: { type: 'integer', example: 5 },
                },
                required: ['page', 'limit', 'total', 'totalPages'],
            },
            ...healthSchemas,
            ...publicSchemas,
            ...usersSchemas,
            ...authSchemas,
            ...postsSchemas,
            ...commentsSchemas,
            ...tagsSchemas,
            ...notificationsSchemas,
            ...aiSchemas,
            ...auditSchemas,
        },
    },
    paths: {
        ...healthPaths,
        ...publicPaths,
        ...usersPaths,
        ...authPaths,
        ...postsPaths,
        ...commentsPaths,
        ...tagsPaths,
        ...notificationsPaths,
        ...aiPaths,
        ...auditPaths,
    },
};