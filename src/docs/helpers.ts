import type { ZodType } from 'zod';
import { z } from 'zod';


export function body(schema: ZodType, example?: Record<string, unknown>) {
    const jsonSchema = z.toJSONSchema(schema, { target: 'openapi-3.0' });

    return {
        required: true,
        content: {
            'application/json': {
                schema: jsonSchema,
                ...(example ? { examples: { Example: { value: example } } } : {}),
            },
        },
    };
}


export function envelope(dataSchema: object, description = 'Successful response') {
    return {
        description,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: dataSchema,
                    },
                    required: ['success', 'data'],
                },
            },
        },
    };
}


export function paginatedEnvelope(itemSchema: object, description = 'Paginated list') {
    return {
        description,
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'array', items: itemSchema },
                        pagination: { $ref: '#/components/schemas/PaginationMeta' },
                    },
                    required: ['success', 'data', 'pagination'],
                },
            },
        },
    };
}


export function messageOnly(description: string) {
    return { description };
}


export function errorResponse(description: string, sampleMessage: string, statusCode: number) {
    return {
        description,
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                    Example: {
                        value: { success: false, message: sampleMessage, statusCode },
                    },
                },
            },
        },
    };
}


export const commonErrors = {
    validation: (message = 'Validation failed') =>
        errorResponse('Validation error — request body did not pass schema checks', message, 400),
    unauthorized: (message = 'Authentication token missing') =>
        errorResponse('Missing or invalid JWT access token', message, 401),
    forbidden: (message = 'Only the author or an admin can perform this action') =>
        errorResponse('Authenticated, but not authorized for this action (ownership/role check failed)', message, 403),
    notFound: (resource = 'Resource') =>
        errorResponse(`${resource} not found`, `${resource} not found`, 404),
    conflict: (message = 'Resource already exists') =>
        errorResponse('Conflict — duplicate resource (unique constraint)', message, 409),
    tooManyRequests: (message = 'Too many login attempts, please try again after 15 minutes') =>
        errorResponse('Rate limit exceeded', message, 429),
};