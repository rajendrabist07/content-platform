import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

const app = createApp();

describe('Notifications API - Integration', () => {
    const testOrgId = 'test-org-notifications-integration';
    let userAToken: string;
    let userAId: string;
    let userBToken: string;
    let userBId: string;
    let testPostId: string;

    beforeAll(async () => {
        await prisma.organization.upsert({
            where: { id: testOrgId },
            update: {},
            create: { id: testOrgId, name: 'Notification Org', slug: 'notification-org' },
        });
    });

    afterAll(async () => {
        await prisma.notification.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.comment.deleteMany({ where: { post: { organizationId: testOrgId } } });
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.authToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.organization.delete({ where: { id: testOrgId } });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await prisma.notification.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.comment.deleteMany({ where: { post: { organizationId: testOrgId } } });
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.authToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });

        const userA = await request(app).post('/api/v1/auth/register').send({
            email: 'usera@notif.com',
            password: 'password123',
            name: 'User A',
            organizationId: testOrgId,
        });
        userAToken = userA.body.data.accessToken;
        userAId = userA.body.data.user.id;

        const userB = await request(app).post('/api/v1/auth/register').send({
            email: 'userb@notif.com',
            password: 'password123',
            name: 'User B',
            organizationId: testOrgId,
        });
        userBToken = userB.body.data.accessToken;
        userBId = userB.body.data.user.id;

        const postRes = await request(app)
            .post('/api/v1/posts')
            .set('Authorization', `Bearer ${userAToken}`)
            .send({
                title: 'User A Post on Architecture',
                content: 'This is the detailed post content by User A.',
            });
        testPostId = postRes.body.data.id;
    });

    describe('Comment Notification Trigger', () => {
        it('should create a notification for post author when another user comments', async () => {
            // User B comments on User A's post
            const commentRes = await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userBToken}`)
                .send({ content: 'Awesome post User A!' });

            expect(commentRes.status).toBe(201);

            // Wait brief moment for fire-and-forget event
            await new Promise((resolve) => setTimeout(resolve, 50));

            // User A checks notifications
            const notifRes = await request(app)
                .get('/api/v1/notifications')
                .set('Authorization', `Bearer ${userAToken}`);

            expect(notifRes.status).toBe(200);
            expect(notifRes.body.data.length).toBe(1);
            expect(notifRes.body.data[0].type).toBe('NEW_COMMENT');
            expect(notifRes.body.data[0].read).toBe(false);
            expect(notifRes.body.unreadCount).toBe(1);
        });

        it('should NOT create a notification when author comments on their own post', async () => {
            await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ content: 'My own comment' });

            await new Promise((resolve) => setTimeout(resolve, 50));

            const notifRes = await request(app)
                .get('/api/v1/notifications')
                .set('Authorization', `Bearer ${userAToken}`);

            expect(notifRes.status).toBe(200);
            expect(notifRes.body.data.length).toBe(0);
            expect(notifRes.body.unreadCount).toBe(0);
        });
    });

    describe('Reply Notification Trigger', () => {
        it('should create a reply notification for parent comment author', async () => {
            // User B creates a top-level comment
            const parentComment = await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userBToken}`)
                .send({ content: 'Can you clarify section 2?' });

            const parentId = parentComment.body.data.id;

            // User A replies to User B's comment
            await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userAToken}`)
                .send({ content: 'Sure, section 2 is about loose coupling.', parentId });

            await new Promise((resolve) => setTimeout(resolve, 50));

            // User B checks notifications
            const userBNotifs = await request(app)
                .get('/api/v1/notifications')
                .set('Authorization', `Bearer ${userBToken}`);

            expect(userBNotifs.status).toBe(200);
            expect(userBNotifs.body.data.length).toBe(1);
            expect(userBNotifs.body.data[0].type).toBe('NEW_REPLY');
        });
    });

    describe('Read Status Management', () => {
        let notificationId: string;

        beforeEach(async () => {
            // Generate notification for User A
            await request(app)
                .post(`/api/v1/posts/${testPostId}/comments`)
                .set('Authorization', `Bearer ${userBToken}`)
                .send({ content: 'Great article!' });

            await new Promise((resolve) => setTimeout(resolve, 50));

            const notifs = await request(app)
                .get('/api/v1/notifications')
                .set('Authorization', `Bearer ${userAToken}`);
            notificationId = notifs.body.data[0].id;
        });

        it('should mark single notification as read', async () => {
            const markRes = await request(app)
                .patch(`/api/v1/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${userAToken}`);

            expect(markRes.status).toBe(200);
            expect(markRes.body.data.read).toBe(true);

            // Check unread count
            const countRes = await request(app)
                .get('/api/v1/notifications/unread-count')
                .set('Authorization', `Bearer ${userAToken}`);

            expect(countRes.status).toBe(200);
            expect(countRes.body.data.unreadCount).toBe(0);
        });

        it('should mark all notifications as read', async () => {
            const markAllRes = await request(app)
                .patch('/api/v1/notifications/read-all')
                .set('Authorization', `Bearer ${userAToken}`);

            expect(markAllRes.status).toBe(200);
            expect(markAllRes.body.data.markedCount).toBeGreaterThanOrEqual(1);

            const countRes = await request(app)
                .get('/api/v1/notifications/unread-count')
                .set('Authorization', `Bearer ${userAToken}`);

            expect(countRes.body.data.unreadCount).toBe(0);
        });

        it('should return 404 when user tries to mark another user notification as read', async () => {
            const res = await request(app)
                .patch(`/api/v1/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${userBToken}`);

            expect(res.status).toBe(404);
        });
    });
});
