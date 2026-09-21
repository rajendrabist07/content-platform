import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

const app = createApp();

describe('Comments API - Integration', () => {
    const testOrgId = 'test-org-comments-integration';
    let userAToken: string;
    let userBToken: string;
    let testPostId: string;

    beforeAll(async () => {
        await prisma.organization.upsert({
            where: { id: testOrgId },
            update: {},
            create: { id: testOrgId, name: 'Comments Test Org', slug: 'comments-test-org' },
        });
    });

    afterAll(async () => {
        await prisma.comment.deleteMany({ where: { post: { organizationId: testOrgId } } });
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.organization.delete({ where: { id: testOrgId } });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await prisma.comment.deleteMany({ where: { post: { organizationId: testOrgId } } });
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });

        const userA = await request(app).post('/api/v1/auth/register').send({
            email: 'usera@commenttest.com',
            password: 'password123',
            name: 'User A',
            organizationId: testOrgId,
        });
        userAToken = userA.body.data.accessToken;

        const userB = await request(app).post('/api/v1/auth/register').send({
            email: 'userb@commenttest.com',
            password: 'password123',
            name: 'User B',
            organizationId: testOrgId,
        });
        userBToken = userB.body.data.accessToken;

        const post = await request(app)
            .post('/api/v1/posts')
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ title: 'Comment Test Post', content: 'Post for comment testing.' });
        testPostId = post.body.data.id;
    });

    describe('POST /api/v1/posts/:postId/comments', () => {
        it('should create a top-level comment with parentId null', async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ content: 'First comment' });

            expect(response.status).toBe(201);
            expect(response.body.data.parentId).toBeNull();
        });

        it('should create a threaded reply with correct parentId', async () => {
            const parent = await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ content: 'Parent comment' });

            const parentId = parent.body.data.id;

            const reply = await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userBToken}`)
                .send({ content: 'Reply comment', parentId });

            expect(reply.status).toBe(201);
            expect(reply.body.data.parentId).toBe(parentId);
        });

        it('should return 404 when commenting on a non-existent post', async () => {
            const response = await request(app)
                .post('/api/v1/posts/non-existent-post-id/comments')
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ content: 'Should fail' });

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/v1/posts/:postId/comments - nested replies', () => {
        it('should return top-level comments with nested replies array', async () => {
            const parent = await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ content: 'Parent' });

            await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userBToken}`)
                .send({ content: 'Reply', parentId: parent.body.data.id });

            const response = await request(app)
                .get(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userAToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].replies).toHaveLength(1);
        });
    });

    describe('Authorization - comment ownership', () => {
        it('should return 403 when a non-author tries to update a comment', async () => {
            const comment = await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ content: 'User A comment' });

            const response = await request(app)
                .patch(`/api/v1/posts/${testPostId}/comments/${comment.body.data.id}`)
                .set('Authorization', `Bearer ${userBToken}`)
                .send({ content: 'Hacked!' });

            expect(response.status).toBe(403);
        });

        it('should return 403 when a non-author tries to delete a comment', async () => {
            const comment = await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ content: 'User A comment 2' });

            const response = await request(app)
                .delete(`/api/v1/posts/${testPostId}/comments/${comment.body.data.id}`)
                .set('Authorization', `Bearer ${userBToken}`);

            expect(response.status).toBe(403);
        });

        it('should allow the author to delete their own comment (204)', async () => {
            const comment = await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ content: 'To be deleted' });

            const response = await request(app)
                .delete(`/api/v1/posts/${testPostId}/comments/${comment.body.data.id}`)
                .set('Authorization', `Bearer ${userAToken}`);

            expect(response.status).toBe(204);
        });
    });
});