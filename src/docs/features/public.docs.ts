import { commonErrors } from '../helpers';

export const publicSchemas = {
  PublicTagItem: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cmu123tag' },
      name: { type: 'string', example: 'nodejs' },
      postCount: { type: 'integer', example: 12 },
    },
  },
  SitemapItem: {
    type: 'object',
    properties: {
      slug: { type: 'string', example: 'building-scalable-apis' },
      url: { type: 'string', example: 'http://localhost:3000/posts/building-scalable-apis' },
      publishedAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-10-03T12:00:00.000Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2026-10-03T12:00:00.000Z' },
    },
  },
};

export const publicPaths = {
  '/public/posts': {
    get: {
      tags: ['Public'],
      summary: 'List published posts publicly (SEO / Unauthenticated)',
      description: 'Public read endpoint returning only PUBLISHED posts with caching headers.',
      security: [],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        { name: 'tag', in: 'query', schema: { type: 'string' }, description: 'Filter by tag name' },
        { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search title and content' },
        { name: 'authorId', in: 'query', schema: { type: 'string' } },
        { name: 'organizationId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Published posts list',
          headers: {
            'Cache-Control': { schema: { type: 'string', example: 'public, max-age=60, s-maxage=300' } },
          },
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
      },
    },
  },
  '/public/posts/{slug}': {
    get: {
      tags: ['Public'],
      summary: 'Get published post by slug',
      description: 'Returns published post matching slug with caching headers.',
      security: [],
      parameters: [
        { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Post details',
          headers: {
            'Cache-Control': { schema: { type: 'string', example: 'public, max-age=120, s-maxage=600' } },
          },
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Post' },
                },
              },
            },
          },
        },
        '404': commonErrors.notFound('Post'),
      },
    },
  },
  '/public/tags': {
    get: {
      tags: ['Public'],
      summary: 'List all tags with published post counts',
      security: [],
      responses: {
        '200': {
          description: 'Tags list with post counts',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PublicTagItem' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  '/public/sitemap': {
    get: {
      tags: ['Public'],
      summary: 'SEO Sitemap index of published posts',
      security: [],
      responses: {
        '200': {
          description: 'Published post sitemap URLs',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/SitemapItem' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
