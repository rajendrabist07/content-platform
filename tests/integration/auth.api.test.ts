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
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.organization.delete({ where: { id: testOrgId } });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
    });

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user and return a token', async () => {
            const response = await request(app).post('/api/v1/auth/register').send({
                email: 'integration-test@example.com',
                password: 'password123',
                name: 'Integration Test User',
                organizationId: testOrgId,
            });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('integration-test@example.com');
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.refreshToken).toBeDefined();
            expect(response.body.data.user.passwordHash).toBeUndefined();
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
});