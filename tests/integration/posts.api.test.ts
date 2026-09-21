import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

const app = createApp();

describe('Posts API - Integration', () => {
    const testOrgId = 'test-org-posts-integration';
    let userAToken: string;
    let userAId: string;
    let userBToken: string;

    beforeAll(async () => {
        await prisma.organization.upsert({
            where: { id: testOrgId },
            update: {},
            create: { id: testOrgId, name: 'Posts Test Org', slug: 'posts-test-org' },
        });
    });

    afterAll(async () => {
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.organization.delete({ where: { id: testOrgId } });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });

        const userAResponse = await request(app).post('/api/v1/auth/register').send({
            email: 'usera@postest.com',
            password: 'password123',
            name: 'User A',
            organizationId: testOrgId,
        });
        userAToken = userAResponse.body.data.accessToken;
        userAId = userAResponse.body.data.user.id;

        const userBResponse = await request(app).post('/api/v1/auth/register').send({
            email: 'userb@postest.com',
            password: 'password123',
            name: 'User B',
            organizationId: testOrgId,
        });
        userBToken = userBResponse.body.data.accessToken;
    });

    describe('POST /api/v1/posts', () => {
        it('should reject post creation without auth token', async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .send({ title: 'No Auth Post', content: 'This should fail.' });

            expect(response.status).toBe(401);
        });

        it('should create a post when authenticated, and derive authorId from token', async () => {
            const response = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ title: 'Integration Test Post', content: 'Testing post creation.' });

            expect(response.status).toBe(201);
            expect(response.body.data.authorId).toBe(userAId);
            expect(response.body.data.organizationId).toBeUndefined();
        });
    });

    describe('Authorization - cross-user protection', () => {
        it('should return 403 when a non-author tries to publish someone else\'s post', async () => {
            const createResponse = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ title: 'User A Post', content: 'Only User A owns this.' });

            const postId = createResponse.body.data.id;

            const publishResponse = await request(app)
                .patch(`/api/v1/posts/${postId}/publish`)
                .set('Authorization', `Bearer ${userBToken}`);

            expect(publishResponse.status).toBe(403);
            expect(publishResponse.body.message).toContain('Only the author');
        });

        it('should return 403 when a non-author tries to delete someone else\'s post', async () => {
            const createResponse = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ title: 'Another User A Post', content: 'Delete protection test.' });

            const postId = createResponse.body.data.id;

            const deleteResponse = await request(app)
                .delete(`/api/v1/posts/${postId}`)
                .set('Authorization', `Bearer ${userBToken}`);

            expect(deleteResponse.status).toBe(403);
        });
    });

    describe('GET /api/v1/posts - pagination', () => {
        it('should return paginated results with correct metadata', async () => {
            for (let i = 1; i <= 3; i++) {
                await request(app)
                    .post('/api/v1/posts')
                    .set('Authorization', `Bearer ${userAToken}`)
                    .send({ title: `Pagination Post ${i}`, content: `Content number ${i} here.` });
            }

            const response = await request(app)
                .get('/api/v1/posts?page=1&limit=2')
                .set('Authorization', `Bearer ${userAToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination.total).toBe(3);
            expect(response.body.pagination.totalPages).toBe(2);
        });
    });
});