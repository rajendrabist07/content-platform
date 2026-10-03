import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

const app = createApp();

describe('Engagement & User Profiles - Integration', () => {
    const testOrgId = 'test-org-engagement-integration';
    let userToken: string;
    let userId: string;
    let testPostId: string;

    beforeAll(async () => {
        await prisma.organization.upsert({
            where: { id: testOrgId },
            update: {},
            create: { id: testOrgId, name: 'Engagement Org', slug: 'engagement-org' },
        });
    });

    afterAll(async () => {
        await prisma.bookmark.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.postLike.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.profile.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.authToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.organization.delete({ where: { id: testOrgId } });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await prisma.bookmark.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.postLike.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.profile.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.authToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });

        const userRes = await request(app).post('/api/v1/auth/register').send({
            email: 'engaged@example.com',
            password: 'password123',
            name: 'Engaged User',
            organizationId: testOrgId,
        });
        userToken = userRes.body.data.accessToken;
        userId = userRes.body.data.user.id;

        const postRes = await request(app)
            .post('/api/v1/posts')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                title: 'Post on Web Performance',
                content: 'Deep dive into optimizing Web Vitals and TTFB.',
                status: 'PUBLISHED',
            });
        testPostId = postRes.body.data.id;
    });

    describe('Likes Management', () => {
        it('should like and unlike a post and reflect updated likeCount', async () => {
            // Initial like
            const likeRes = await request(app)
                .post(`/api/v1/posts/${testPostId}/like`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(likeRes.status).toBe(200);
            expect(likeRes.body.data.liked).toBe(true);
            expect(likeRes.body.data.likeCount).toBe(1);

            // Fetch post to verify likeCount on DTO
            const postRes = await request(app)
                .get(`/api/v1/posts/${testPostId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(postRes.status).toBe(200);
            expect(postRes.body.data.likeCount).toBe(1);

            // Unlike
            const unlikeRes = await request(app)
                .delete(`/api/v1/posts/${testPostId}/like`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(unlikeRes.status).toBe(200);
            expect(unlikeRes.body.data.liked).toBe(false);
            expect(unlikeRes.body.data.likeCount).toBe(0);
        });
    });

    describe('Bookmarks Management', () => {
        it('should bookmark a post, list in bookmarks, and remove bookmark', async () => {
            // Add bookmark
            const bmRes = await request(app)
                .post(`/api/v1/posts/${testPostId}/bookmark`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(bmRes.status).toBe(200);
            expect(bmRes.body.data.bookmarked).toBe(true);

            // List bookmarks
            const listRes = await request(app)
                .get('/api/v1/bookmarks')
                .set('Authorization', `Bearer ${userToken}`);

            expect(listRes.status).toBe(200);
            expect(listRes.body.data.length).toBe(1);
            expect(listRes.body.data[0].id).toBe(testPostId);

            // Delete bookmark
            const delRes = await request(app)
                .delete(`/api/v1/posts/${testPostId}/bookmark`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(delRes.status).toBe(200);
            expect(delRes.body.data.bookmarked).toBe(false);

            // List bookmarks again -> empty
            const listEmptyRes = await request(app)
                .get('/api/v1/bookmarks')
                .set('Authorization', `Bearer ${userToken}`);

            expect(listEmptyRes.status).toBe(200);
            expect(listEmptyRes.body.data.length).toBe(0);
        });
    });

    describe('User Profile Management', () => {
        it('should get and update current user profile and preferences', async () => {
            const meRes = await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${userToken}`);

            expect(meRes.status).toBe(200);
            expect(meRes.body.data.email).toBe('engaged@example.com');
            expect(meRes.body.data.bio).toBeNull();
            expect(meRes.body.data.emailNotifications).toBe(true);

            const updateRes = await request(app)
                .patch('/api/v1/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    name: 'Engaged Lead Engineer',
                    bio: 'Senior Software Engineer building high-throughput systems.',
                    avatarUrl: 'https://example.com/avatar.png',
                    emailNotifications: false,
                });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.name).toBe('Engaged Lead Engineer');
            expect(updateRes.body.data.bio).toBe('Senior Software Engineer building high-throughput systems.');
            expect(updateRes.body.data.avatarUrl).toBe('https://example.com/avatar.png');
            expect(updateRes.body.data.emailNotifications).toBe(false);
        });
    });
});
