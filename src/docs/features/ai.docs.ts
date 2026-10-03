import { suggestContentSchema } from '../../modules/ai/ai.validation';
import { body, envelope, commonErrors } from '../helpers';

export const aiSchemas = {
    AiSuggestion: {
        type: 'object',
        properties: {
            title: { type: 'string', example: 'Getting Started with Clean Architecture in TypeScript' },
            tags: {
                type: 'array',
                items: { type: 'string' },
                example: ['typescript', 'clean-architecture', 'backend'],
            },
            summary: {
                type: 'string',
                example: 'A comprehensive guide to structuring scalable Node.js and TypeScript backends using Clean Architecture principles.',
            },
        },
        required: ['title', 'tags', 'summary'],
    },
};

export const aiPaths = {
    '/ai/suggest': {
        post: {
            tags: ['AI'],
            summary: 'Generate post suggestions (title, tags, summary)',
            description:
                'Stateless helper endpoint powered by Google Gemini API. Analyzes post content (minimum 20 characters) and generates a structured title, tags, and summary. Authenticated and rate-limited to 10 requests per 15 minutes.',
            security: [{ bearerAuth: [] }],
            requestBody: body(suggestContentSchema, {
                content: 'Clean architecture helps create scalable and maintainable applications by decoupling core business logic from frameworks and external services.',
            }),
            responses: {
                '200': envelope({ $ref: '#/components/schemas/AiSuggestion' }, 'AI suggestions generated successfully'),
                '400': commonErrors.validation('Content must be at least 20 characters'),
                '401': commonErrors.unauthorized(),
                '429': commonErrors.tooManyRequests('Too many AI requests, please try again after 15 minutes'),
                '503': {
                    description: 'Service Unavailable — AI suggestion service is temporarily unavailable',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            examples: {
                                Example: {
                                    value: {
                                        success: false,
                                        message: 'AI suggestion service is temporarily unavailable',
                                        statusCode: 503,
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
