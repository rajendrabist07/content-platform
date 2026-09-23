import { createCommentSchema, updateCommentSchema } from '../../modules/comments/comment.validation';
import { body, envelope, messageOnly, commonErrors } from '../helpers';

export const commentsSchemas = {
    Comment: {
        type: 'object',
        properties: {
            id: { type: 'string', example: 'cmu2owjtd000004i2u22zbpg5' },
            content: { type: 'string', example: 'This is my comment.' },
            postId: { type: 'string', example: 'cmu2okrcx000004i6a7884gth' },
            authorId: { type: 'string', example: 'cmucki5fs0001043rqx88trvo' },
            parentId: { type: 'string', nullable: true, example: null },
            createdAt: { type: 'string', format: 'date-time', example: '2026-09-15T13:10:42.001Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-09-15T13:10:42.001Z' },
            replies: {
                type: 'array',
                items: { $ref: '#/components/schemas/Comment' },
            },
        },
    },
};

export const commentsPaths = {
    '/posts/{postId}/comments': {
        post: {
            tags: ['Comments'],
            summary: 'Create a comment (or a threaded reply)',
            description:
                'Omit parentId for a top-level comment; include it to create a reply — the parent comment must exist and belong to the same post. 404 if the post does not exist.',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
            requestBody: body(createCommentSchema, { content: 'This is my first comment!' }),
            responses: {
                '201': envelope({ $ref: '#/components/schemas/Comment' }, 'Comment created'),
                '400': commonErrors.validation('Comment cannot be empty'),
                '401': commonErrors.unauthorized(),
                '404': commonErrors.notFound('Post'),
            },
        },
        get: {
            tags: ['Comments'],
            summary: 'List comments for a post (threaded)',
            description: 'Returns only top-level comments (parentId: null); each carries a nested replies array (one level deep).',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
            responses: {
                '200': envelope({ type: 'array', items: { $ref: '#/components/schemas/Comment' } }, 'Threaded comment list'),
                '401': commonErrors.unauthorized(),
                '404': commonErrors.notFound('Post'),
            },
        },
    },
    '/posts/{postId}/comments/{id}': {
        patch: {
            tags: ['Comments'],
            summary: 'Update a comment',
            description: "403 if the caller is not the comment's author or an admin/owner.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            ],
            requestBody: body(updateCommentSchema, { content: 'Updated comment content.' }),
            responses: {
                '200': envelope({ $ref: '#/components/schemas/Comment' }, 'Comment updated'),
                '400': commonErrors.validation(),
                '401': commonErrors.unauthorized(),
                '403': commonErrors.forbidden('Only the author or an admin can update this comment'),
                '404': commonErrors.notFound('Comment'),
            },
        },
        delete: {
            tags: ['Comments'],
            summary: 'Delete a comment (soft delete)',
            description: "403 if the caller is not the comment's author or an admin/owner.",
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
                { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
                '204': messageOnly('Comment soft-deleted, no content returned'),
                '401': commonErrors.unauthorized(),
                '403': commonErrors.forbidden('Only the author or an admin can delete this comment'),
                '404': commonErrors.notFound('Comment'),
            },
        },
    },
};