import { createPostSchema, updatePostSchema } from '../../modules/posts/post.validation';
import { body, envelope, paginatedEnvelope, messageOnly, commonErrors } from '../helpers';

export const postsSchemas = {
    Post: {
        type: 'object',
        properties: {
            id: { type: 'string', example: 'cmuckyavc000a043r8pyma0x5' },
            title: { type: 'string', example: 'My First Post' },
            slug: { type: 'string', example: 'my-first-post' },
            content: { type: 'string', example: 'This is the content of my post, at least ten characters long.' },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], example: 'DRAFT' },
            publishedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
            authorName: { type: 'string', example: 'Jane Doe' },
            authorId: { type: 'string', example: 'cmucki5fs0001043rqx88trvo' },
            likeCount: { type: 'integer', example: 7 },
            createdAt: { type: 'string', format: 'date-time', example: '2026-09-22T11:17:47.016Z' },
            tags: {
                type: 'array',
                items: { $ref: '#/components/schemas/Tag' },
            },
        },
    },
};

export const postsPaths = {
    '/posts': {
        post: {
            tags: ['Posts'],
            summary: 'Create a post',
            description:
                "authorId and organizationId are derived from the access token, never from the request body — this prevents a client from claiming another user's identity. slug is auto-generated from title and guaranteed unique within the organization.",
            security: [{ bearerAuth: [] }],
            requestBody: body(createPostSchema, {
                title: 'My First Post',
                content: 'This is the content of my post, at least ten characters long.',
                status: 'DRAFT',
            }),
            responses: {
                '201': envelope({ $ref: '#/components/schemas/Post' }, 'Post created'),
                '400': commonErrors.validation('Title must be at least 3 characters'),
                '401': commonErrors.unauthorized(),
            },
        },
        get: {
            tags: ['Posts'],
            summary: 'List posts (paginated)',
            description:
                'Returns posts belonging to the caller\'s Organization only. page/limit are sanitized server-side, limit is capped at 50.',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } },
                {
                    name: 'status',
                    in: 'query',
                    schema: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
                    description: 'Filter posts by publication status (optional)',
                },
            ],
            responses: {
                '200': paginatedEnvelope({ $ref: '#/components/schemas/Post' }, 'Paginated list of posts'),
                '401': commonErrors.unauthorized(),
            },
        },
    },
    '/posts/{id}': {
        get: {
            tags: ['Posts'],
            summary: 'Get a single post by ID',
            description:
                'Returns 404 both when the post does not exist AND when it belongs to a different organization.',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
                '200': envelope({ $ref: '#/components/schemas/Post' }, 'Post found'),
                '401': commonErrors.unauthorized(),
                '404': commonErrors.notFound('Post'),
            },
        },
        patch: {
            tags: ['Posts'],
            summary: 'Update a post (partial)',
            description: 'Send only the fields to change. Slug remains immutable once published.',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            requestBody: body(updatePostSchema, { title: 'Updated Title' }),
            responses: {
                '200': envelope({ $ref: '#/components/schemas/Post' }, 'Post updated'),
                '400': commonErrors.validation(),
                '401': commonErrors.unauthorized(),
                '403': commonErrors.forbidden('Only the author or an admin can update this post'),
                '404': commonErrors.notFound('Post'),
            },
        },
        delete: {
            tags: ['Posts'],
            summary: 'Delete a post (soft delete)',
            description: 'Sets deletedAt timestamp.',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
                '204': messageOnly('Post soft-deleted, no content returned'),
                '401': commonErrors.unauthorized(),
                '403': commonErrors.forbidden('Only the author or an admin can delete this post'),
                '404': commonErrors.notFound('Post'),
            },
        },
    },
    '/posts/{id}/publish': {
        patch: {
            tags: ['Posts'],
            summary: 'Publish a post',
            description: 'Sets status to PUBLISHED and stamps publishedAt. 403 if not author/admin, 409 if already published.',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
                '200': envelope({ $ref: '#/components/schemas/Post' }, 'Post published'),
                '401': commonErrors.unauthorized(),
                '403': commonErrors.forbidden('Only the author or an admin can publish this post'),
                '404': commonErrors.notFound('Post'),
                '409': commonErrors.conflict('Post is already published'),
            },
        },
    },
    '/posts/{id}/like': {
        post: {
            tags: ['Posts'],
            summary: 'Like a post',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
                '200': envelope({ type: 'object', properties: { liked: { type: 'boolean' }, likeCount: { type: 'integer' } } }, 'Post liked'),
                '401': commonErrors.unauthorized(),
                '404': commonErrors.notFound('Post'),
            },
        },
        delete: {
            tags: ['Posts'],
            summary: 'Unlike a post',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
                '200': envelope({ type: 'object', properties: { liked: { type: 'boolean' }, likeCount: { type: 'integer' } } }, 'Post unliked'),
                '401': commonErrors.unauthorized(),
                '404': commonErrors.notFound('Post'),
            },
        },
    },
    '/posts/{id}/bookmark': {
        post: {
            tags: ['Posts'],
            summary: 'Bookmark a post',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
                '200': envelope({ type: 'object', properties: { bookmarked: { type: 'boolean' } } }, 'Post bookmarked'),
                '401': commonErrors.unauthorized(),
                '404': commonErrors.notFound('Post'),
            },
        },
        delete: {
            tags: ['Posts'],
            summary: 'Remove bookmark from a post',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
                '200': envelope({ type: 'object', properties: { bookmarked: { type: 'boolean' } } }, 'Bookmark removed'),
                '401': commonErrors.unauthorized(),
                '404': commonErrors.notFound('Post'),
            },
        },
    },
};