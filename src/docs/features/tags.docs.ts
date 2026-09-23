import { createTagSchema, attachTagsSchema } from '../../modules/tags/tag.validation';
import { body, envelope, messageOnly, commonErrors } from '../helpers';

export const tagsSchemas = {
    Tag: {
        type: 'object',
        properties: {
            id: { type: 'string', example: 'cmu6xyza00002047bzvu1acrc' },
            name: { type: 'string', example: 'javascript' },
        },
    },
};

export const tagsPaths = {
    '/tags': {
        post: {
            tags: ['Tags'],
            summary: 'Create a tag',
            description:
                'Tag names are normalized to lowercase before storage — "JavaScript" and "javascript" are treated as the same tag (409 on duplicate).',
            security: [{ bearerAuth: [] }],
            requestBody: body(createTagSchema, { name: 'JavaScript' }),
            responses: {
                '201': envelope({ $ref: '#/components/schemas/Tag' }, 'Tag created'),
                '400': commonErrors.validation('Tag name cannot be empty'),
                '401': commonErrors.unauthorized(),
                '409': commonErrors.conflict('Tag "javascript" already exists'),
            },
        },
        get: {
            tags: ['Tags'],
            summary: 'List all tags',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': envelope({ type: 'array', items: { $ref: '#/components/schemas/Tag' } }, 'All tags'),
                '401': commonErrors.unauthorized(),
            },
        },
    },
    '/posts/{postId}/tags': {
        post: {
            tags: ['Tags'],
            summary: 'Attach one or more tags to a post',
            description:
                'All tagIds must exist — 404 if any are invalid. Re-attaching an already-attached tag is a silent no-op (no duplicate junction row).',
            security: [{ bearerAuth: [] }],
            parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
            requestBody: body(attachTagsSchema, { tagIds: ['cmu6xyza00002047bzvu1acrc'] }),
            responses: {
                '201': envelope({ type: 'array', items: { $ref: '#/components/schemas/Tag' } }, 'Tags now attached to the post'),
                '400': commonErrors.validation('At least one tagId is required'),
                '401': commonErrors.unauthorized(),
                '404': commonErrors.notFound('Post'),
            },
        },
    },
    '/posts/{postId}/tags/{tagId}': {
        delete: {
            tags: ['Tags'],
            summary: 'Detach a tag from a post',
            security: [{ bearerAuth: [] }],
            parameters: [
                { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
                { name: 'tagId', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
                '204': messageOnly('Tag detached, no content returned'),
                '401': commonErrors.unauthorized(),
                '404': commonErrors.notFound('Post'),
            },
        },
    },
};