import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

const app = createApp();

describe('Auth API - Integration', () => {
    const testOrgId = 'test-org-integration';

    beforeAll(async () => {
        await prisma.organization.upsert({
            where: { id: testOrgId },
            update: {},
            create: { id: testOrgId, name: 'Integration Test Org', slug: 'integration-test-org' },
        });
    });

    afterAll(async () => {
        await prisma.authToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.organization.delete({ where: { id: testOrgId } });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await prisma.authToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
    });

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user, return tokens, and mark emailVerified as false', async () => {
            const response = await request(app).post('/api/v1/auth/register').send({
                email: 'integration-test@example.com',
                password: 'password123',
                name: 'Integration Test User',
                organizationId: testOrgId,
            });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('integration-test@example.com');
            expect(response.body.data.user.emailVerified).toBe(false);
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.refreshToken).toBeDefined();
            expect(response.body.data.user.passwordHash).toBeUndefined();

            // Verify an AuthToken of type EMAIL_VERIFICATION was generated
            const token = await prisma.authToken.findFirst({
                where: { user: { email: 'integration-test@example.com' }, type: 'EMAIL_VERIFICATION' },
            });
            expect(token).toBeDefined();
            expect(token?.token).toBeDefined();
        });

        it('should reject duplicate email registration', async () => {
            await request(app).post('/api/v1/auth/register').send({
                email: 'duplicate@example.com',
                password: 'password123',
                name: 'First User',
                organizationId: testOrgId,
            });

            const response = await request(app).post('/api/v1/auth/register').send({
                email: 'duplicate@example.com',
                password: 'differentpass123',
                name: 'Second User',
                organizationId: testOrgId,
            });

            expect(response.status).toBe(409);
            expect(response.body.message).toContain('already registered');
        });

        it('should reject password longer than 72 characters', async () => {
            const response = await request(app).post('/api/v1/auth/register').send({
                email: 'toolong@example.com',
                password: 'a'.repeat(73),
                name: 'Too Long',
                organizationId: testOrgId,
            });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('72 characters');
        });
    });

    describe('POST /api/v1/auth/login', () => {
        beforeEach(async () => {
            await request(app).post('/api/v1/auth/register').send({
                email: 'logintest@example.com',
                password: 'correctpassword',
                name: 'Login Test User',
                organizationId: testOrgId,
            });
        });

        it('should login successfully with correct credentials', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                email: 'logintest@example.com',
                password: 'correctpassword',
            });

            expect(response.status).toBe(200);
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.refreshToken).toBeDefined();
            expect(response.body.data.user.emailVerified).toBe(false);
        });

        it('should return generic error for wrong password (no enumeration)', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                email: 'logintest@example.com',
                password: 'wrongpassword',
            });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid email or password');
        });
    });

    describe('Email Verification Flow', () => {
        it('should successfully verify email when given a valid token', async () => {
            await request(app).post('/api/v1/auth/register').send({
                email: 'verify@example.com',
                password: 'password123',
                name: 'Verify User',
                organizationId: testOrgId,
            });

            const tokenRecord = await prisma.authToken.findFirst({
                where: { user: { email: 'verify@example.com' }, type: 'EMAIL_VERIFICATION' },
            });
            expect(tokenRecord).toBeDefined();

            const res = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: tokenRecord?.token });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user.emailVerified).toBe(true);

            // Ensure token cannot be reused
            const reuseRes = await request(app)
                .post('/api/v1/auth/verify-email')
                .send({ token: tokenRecord?.token });

            expect(reuseRes.status).toBe(400);
            expect(reuseRes.body.message).toContain('Invalid or expired verification token');
        });

        it('should resend verification email without user enumeration', async () => {
            await request(app).post('/api/v1/auth/register').send({
                email: 'resend@example.com',
                password: 'password123',
                name: 'Resend User',
                organizationId: testOrgId,
            });

            const res = await request(app)
                .post('/api/v1/auth/resend-verification')
                .send({ email: 'resend@example.com' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Non-existent email also returns 200
            const ghostRes = await request(app)
                .post('/api/v1/auth/resend-verification')
                .send({ email: 'nonexistent@example.com' });

            expect(ghostRes.status).toBe(200);
            expect(ghostRes.body.success).toBe(true);
        });
    });

    describe('Password Reset & Change Flow', () => {
        let userAccessToken: string;

        beforeEach(async () => {
            const reg = await request(app).post('/api/v1/auth/register').send({
                email: 'resetme@example.com',
                password: 'oldPassword123',
                name: 'Reset User',
                organizationId: testOrgId,
            });
            userAccessToken = reg.body.data.accessToken;
        });

        it('should handle forgot password and reset password successfully', async () => {
            const forgotRes = await request(app)
                .post('/api/v1/auth/forgot-password')
                .send({ email: 'resetme@example.com' });

            expect(forgotRes.status).toBe(200);

            const resetTokenRecord = await prisma.authToken.findFirst({
                where: { user: { email: 'resetme@example.com' }, type: 'PASSWORD_RESET', usedAt: null },
            });
            expect(resetTokenRecord).toBeDefined();

            const resetRes = await request(app)
                .post('/api/v1/auth/reset-password')
                .send({
                    token: resetTokenRecord?.token,
                    newPassword: 'newPassword123',
                });

            expect(resetRes.status).toBe(200);
            expect(resetRes.body.success).toBe(true);

            // Attempt login with new password
            const loginRes = await request(app).post('/api/v1/auth/login').send({
                email: 'resetme@example.com',
                password: 'newPassword123',
            });
            expect(loginRes.status).toBe(200);

            // Attempt login with old password fails
            const oldLoginRes = await request(app).post('/api/v1/auth/login').send({
                email: 'resetme@example.com',
                password: 'oldPassword123',
            });
            expect(oldLoginRes.status).toBe(401);
        });

        it('should allow authenticated user to change password', async () => {
            const changeRes = await request(app)
                .post('/api/v1/auth/change-password')
                .set('Authorization', `Bearer ${userAccessToken}`)
                .send({
                    oldPassword: 'oldPassword123',
                    newPassword: 'brandNewPassword123',
                });

            expect(changeRes.status).toBe(200);
            expect(changeRes.body.success).toBe(true);

            // Verify new password works
            const loginRes = await request(app).post('/api/v1/auth/login').send({
                email: 'resetme@example.com',
                password: 'brandNewPassword123',
            });
            expect(loginRes.status).toBe(200);
        });
    });
});