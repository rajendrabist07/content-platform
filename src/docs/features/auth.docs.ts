import { registerSchema, loginSchema } from '../../modules/auth/auth.validation';
import { body, envelope, messageOnly, commonErrors, errorResponse } from '../helpers';

export const authSchemas = {
    UserPublic: {
        type: 'object',
        properties: {
            id: { type: 'string', example: 'cmucki5fs0001043rqx88trvo' },
            email: { type: 'string', format: 'email', example: 'rajendra@example.com' },
            name: { type: 'string', example: 'Rajendra Bist' },
            role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'], example: 'MEMBER' },
        },
    },
    AuthResponse: {
        type: 'object',
        properties: {
            user: { $ref: '#/components/schemas/UserPublic' },
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            refreshToken: { type: 'string', example: '580f6844f8815594d512d61576666b4f9667c...' },
        },
    },
    RefreshRequest: {
        type: 'object',
        properties: {
            refreshToken: { type: 'string', example: '580f6844f8815594d512d61576666b4f9667c...' },
        },
        required: ['refreshToken'],
    },
    RefreshResponse: {
        type: 'object',
        properties: {
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
    },
};

export const authPaths = {
    '/auth/register': {
        post: {
            tags: ['Auth'],
            summary: 'Register a new user',
            description:
                'Creates a user in the given Organization. Password is hashed with bcrypt before storage — never returned. 409 if the email is already registered; 404 if the organizationId does not exist.',
            security: [],
            requestBody: body(registerSchema, {
                email: 'newuser@example.com',
                password: 'password123',
                name: 'New User',
                organizationId: 'cmtptqw25000004a4h6wfbuao',
            }),
            responses: {
                '201': envelope({ $ref: '#/components/schemas/AuthResponse' }, 'User created'),
                '400': commonErrors.validation('Password must be at least 8 characters'),
                '404': commonErrors.notFound('Organization'),
                '409': commonErrors.conflict('Email already registered'),
            },
        },
    },
    '/auth/login': {
        post: {
            tags: ['Auth'],
            summary: 'Log in with email and password',
            description:
                'Wrong email and wrong password both return the identical 401 message, to prevent attackers enumerating registered emails. Rate-limited to 5 failed attempts per 15 minutes per IP.',
            security: [],
            requestBody: body(loginSchema, {
                email: 'rajendra@example.com',
                password: 'securePass123',
            }),
            responses: {
                '200': envelope({ $ref: '#/components/schemas/AuthResponse' }, 'Login successful'),
                '400': commonErrors.validation(),
                '401': errorResponse('Invalid credentials', 'Invalid email or password', 401),
                '429': commonErrors.tooManyRequests(),
            },
        },
    },
    '/auth/refresh': {
        post: {
            tags: ['Auth'],
            summary: 'Exchange a refresh token for a new access token',
            description:
                'Does not rotate the refresh token — the same refreshToken keeps working until it expires (30 days) or /auth/logout revokes it.',
            security: [],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: { refreshToken: { type: 'string' } },
                            required: ['refreshToken'],
                        },
                        examples: {
                            Example: { value: { refreshToken: '580f6844f8815594d512d61576666b4f9667c487d959af7e72a83eb826b6f51e' } },
                        },
                    },
                },
            },
            responses: {
                '200': envelope({ $ref: '#/components/schemas/RefreshResponse' }, 'New access token issued'),
                '400': commonErrors.validation('refreshToken is required'),
                '401': errorResponse('Invalid, expired, or revoked refresh token', 'Invalid refresh token', 401),
            },
        },
    },
    '/auth/logout': {
        post: {
            tags: ['Auth'],
            summary: 'Revoke a refresh token',
            description:
                'Deletes the refresh token server-side (DB row removed) — a stolen refresh token stops working immediately after this call, not just client-side token deletion.',
            security: [],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: { refreshToken: { type: 'string' } },
                            required: ['refreshToken'],
                        },
                        examples: {
                            Example: { value: { refreshToken: '580f6844f8815594d512d61576666b4f9667c487d959af7e72a83eb826b6f51e' } },
                        },
                    },
                },
            },
            responses: {
                '204': messageOnly('Refresh token revoked, no content returned'),
                '400': commonErrors.validation('refreshToken is required'),
            },
        },
    },
};