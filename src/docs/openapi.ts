import { authSchemas, authPaths } from './features/auth.docs';
import { postsSchemas, postsPaths } from './features/posts.docs';
import { commentsSchemas, commentsPaths } from './features/comments.docs';
import { tagsSchemas, tagsPaths } from './features/tags.docs';

export const openApiDocument = {
    openapi: '3.1.0',
    info: {
        title: 'Content Platform API',
        version: '1.0.0',
        description: `
Backend API for the Content Platform (Organizations, Users, Posts, Comments, Tags).

**Response envelope** — every response has the shape \`{ success, data?, message?, statusCode? }\`.

**Errors** — \`success: false\` with a human-readable \`message\` and matching HTTP status code:
400 (validation), 401 (authentication), 403 (authorization — ownership/role), 404 (not found,
including cross-organization access to avoid leaking existence), 409 (conflict/duplicate),
429 (rate limited), 500 (unexpected — generic message only, details are server-side logged).

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
        { name: 'Auth', description: 'Registration, login, token refresh, logout' },
        { name: 'Posts', description: 'Blog post CRUD, pagination, publishing' },
        { name: 'Comments', description: 'Threaded comments on posts' },
        { name: 'Tags', description: 'Tag creation and many-to-many attachment to posts' },
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
            ...authSchemas,
            ...postsSchemas,
            ...commentsSchemas,
            ...tagsSchemas,
        },
    },
    paths: {
        ...authPaths,
        ...postsPaths,
        ...commentsPaths,
        ...tagsPaths,
    },
};