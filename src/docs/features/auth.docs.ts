import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resendVerificationSchema,
} from '../../modules/auth/auth.validation';
import { body, envelope, messageOnly, commonErrors, errorResponse } from '../helpers';

export const authSchemas = {
  UserPublic: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'cmucki5fs0001043rqx88trvo' },
      email: { type: 'string', format: 'email', example: 'rajendra@example.com' },
      name: { type: 'string', example: 'Rajendra Bist' },
      role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'], example: 'MEMBER' },
      emailVerified: { type: 'boolean', example: false },
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
        'Creates a user in the given Organization and dispatches an asynchronous email verification token. Password is hashed with bcrypt before storage — never returned.',
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
        'Wrong email and wrong password both return the identical 401 message to prevent user enumeration. Rate-limited to 5 failed attempts per 15 minutes per IP.',
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
  '/auth/verify-email': {
    post: {
      tags: ['Auth'],
      summary: 'Verify user email address using token',
      description: 'Verifies email address using the one-time token sent via email. Valid for 24 hours.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { token: { type: 'string' } },
              required: ['token'],
            },
            examples: {
              Example: { value: { token: '4e01962bf19...' } },
            },
          },
        },
      },
      responses: {
        '200': envelope({ user: { $ref: '#/components/schemas/UserPublic' } }, 'Email verified successfully'),
        '400': commonErrors.validation('Invalid or expired verification token'),
      },
    },
  },
  '/auth/resend-verification': {
    post: {
      tags: ['Auth'],
      summary: 'Resend email verification link',
      description: 'Dispatches a new verification token to the user email. Anti-enumeration enabled.',
      security: [],
      requestBody: body(resendVerificationSchema, {
        email: 'user@example.com',
      }),
      responses: {
        '200': messageOnly('If your email is registered and unverified, a verification link has been sent.'),
        '429': commonErrors.tooManyRequests(),
      },
    },
  },
  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Request password reset email',
      description: 'Sends a 1-hour password reset token if account exists. Anti-enumeration enabled.',
      security: [],
      requestBody: body(forgotPasswordSchema, {
        email: 'user@example.com',
      }),
      responses: {
        '200': messageOnly('If your email is registered, a password reset link has been sent.'),
        '429': commonErrors.tooManyRequests(),
      },
    },
  },
  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Reset password using reset token',
      description: 'Updates user password, invalidates the reset token, and revokes all active refresh tokens.',
      security: [],
      requestBody: body(resetPasswordSchema, {
        token: '7a8f9024...',
        newPassword: 'newSecurePassword123',
      }),
      responses: {
        '200': messageOnly('Password reset successfully. Please log in with your new password.'),
        '400': commonErrors.validation('Invalid or expired password reset token'),
      },
    },
  },
  '/auth/change-password': {
    post: {
      tags: ['Auth'],
      summary: 'Change password for authenticated user',
      description: 'Validates current password and updates to new password, revoking refresh tokens.',
      security: [{ bearerAuth: [] }],
      requestBody: body(changePasswordSchema, {
        oldPassword: 'currentPassword123',
        newPassword: 'brandNewPassword123',
      }),
      responses: {
        '200': messageOnly('Password changed successfully. Please log in with your new password.'),
        '400': commonErrors.validation(),
        '401': errorResponse('Unauthorized', 'Current password is incorrect', 401),
      },
    },
  },
  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Exchange a refresh token for a new access token',
      description: 'Issues a new JWT access token from valid refresh token.',
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
      description: 'Deletes the refresh token server-side.',
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