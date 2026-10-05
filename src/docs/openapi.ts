import { authSchemas, authPaths } from './features/auth.docs';
import { postsSchemas, postsPaths } from './features/posts.docs';
import { commentsSchemas, commentsPaths } from './features/comments.docs';
import { tagsSchemas, tagsPaths } from './features/tags.docs';
import { aiSchemas, aiPaths } from './features/ai.docs';
import { notificationsSchemas, notificationsPaths } from './features/notifications.docs';
import { publicSchemas, publicPaths } from './features/public.docs';
import { usersSchemas, usersPaths } from './features/users.docs';
import { auditSchemas, auditPaths } from './features/audit.docs';
import { reportsSchemas, reportsPaths } from './features/reports.docs';
import { adminSchemas, adminPaths } from './features/admin.docs';
import { comprehensionSchemas, comprehensionPaths } from './features/comprehension.docs';
import { healthSchemas, healthPaths } from './features/health.docs';

export const openApiDocument = {
    openapi: '3.1.0',
    info: {
        title: 'Chronicle Platform API',
        version: '1.0.0',
        description: `
Backend API for Chronicle (Technical Writing You Can Trust & Learn From: Trust Layer, Grounded Comprehension Engine, Multi-Tenant Architecture, Background Job Queue, Security & Audit Logs).

**Response envelope** — every response has the shape \`{ success, data?, message?, statusCode? }\`.

**Errors** — \`success: false\` with a human-readable \`message\` and matching HTTP status code:
400 (validation), 401 (authentication), 403 (authorization — ownership/role/status), 404 (not found),
409 (conflict/duplicate), 429 (rate limited), 500 (unexpected server error), 503 (upstream AI service unavailable).

**Authentication** — \`POST /auth/register\` and \`POST /auth/login\` return an \`accessToken\`
(15 min) and a \`refreshToken\` (30 days, DB-backed and revocable via \`POST /auth/logout\` or \`/auth/sessions\`).
Send \`Authorization: Bearer <accessToken>\` on every protected request.
    `.trim(),
    },
    servers: [{ url: '/api/v1', description: 'Current server' }],
    tags: [
        { name: 'Health', description: 'Liveness and readiness health checks' },
        { name: 'Public', description: 'Public read endpoints with caching and SEO sitemaps' },
        { name: 'Auth', description: 'Authentication, email verification, sessions, passwords' },
        { name: 'Users', description: 'User profile management and bookmarks' },
        { name: 'Posts', description: 'Post publishing, reviews, and interactions' },
        { name: 'Comprehension', description: 'Grounded AI quizzes, "Ask this article" Q&A, and reader confusion analytics' },
        { name: 'Reports', description: 'Trust & Safety content and user reporting' },
        { name: 'Admin Moderation', description: 'Moderation queue, user trust management, and review actions' },
        { name: 'Comments', description: 'Threaded comments on posts' },
        { name: 'Tags', description: 'Canonical tag system' },
        { name: 'Notifications', description: 'In-app notification system' },
        { name: 'AI', description: 'AI writing assistance and optimization' },
        { name: 'Audit', description: 'Security and audit trail logs' },
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
            ...comprehensionSchemas,
            ...commentsSchemas,
            ...tagsSchemas,
            ...notificationsSchemas,
            ...reportsSchemas,
            ...adminSchemas,
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
        ...comprehensionPaths,
        ...commentsPaths,
        ...tagsPaths,
        ...notificationsPaths,
        ...reportsPaths,
        ...adminPaths,
        ...aiPaths,
        ...auditPaths,
    },
};