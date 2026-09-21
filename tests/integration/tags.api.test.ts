import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

const app = createApp();

describe('Tags API - Integration', () => {
    const testOrgId = 'test-org-tags-integration';
    let userToken: string;
    let testPostId: string;

    beforeAll(async () => {
        await prisma.organization.upsert({
            where: { id: testOrgId },
            update: {},
            create: { id: testOrgId, name: 'Tags Test Org', slug: 'tags-test-org' },
        });
    });

    afterAll(async () => {
        await prisma.tagsOnPosts.deleteMany({ where: { post: { organizationId: testOrgId } } });
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.organization.delete({ where: { id: testOrgId } });
        // Tag global cha (organization-scoped hoina), test tags matra hataune
        await prisma.tag.deleteMany({ where: { name: { startsWith: 'test-tag-' } } });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await prisma.tagsOnPosts.deleteMany({ where: { post: { organizationId: testOrgId } } });
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.tag.deleteMany({ where: { name: { startsWith: 'test-tag-' } } });

        const user = await request(app).post('/api/v1/auth/register').send({
            email: 'tagtester@example.com',
            password: 'password123',
            name: 'Tag Tester',
            organizationId: testOrgId,
        });
        userToken = user.body.data.accessToken;

        const post = await request(app)
            .post('/api/v1/posts')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: 'Tag Test Post', content: 'Post for tag testing.' });
        testPostId = post.body.data.id;
    });

    describe('POST /api/v1/tags', () => {
        it('should create a tag and normalize the name to lowercase', async () => {
            const response = await request(app)
                .post('/api/v1/tags')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'test-tag-JavaScript' });

            expect(response.status).toBe(201);
            expect(response.body.data.name).toBe('test-tag-javascript');
        });

        it('should return 409 when the same tag name is created twice (case-insensitive)', async () => {
            await request(app)
                .post('/api/v1/tags')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'test-tag-Python' });

            const response = await request(app)
                .post('/api/v1/tags')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'test-tag-python' });

            expect(response.status).toBe(409);
        });
    });

    describe('POST /api/v1/posts/:postId/tags - attach', () => {
        it('should attach a tag to a post', async () => {
            const tag = await request(app)
                .post('/api/v1/tags')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'test-tag-nodejs' });

            const response = await request(app)
                .post(`/api/v1/posts/${testPostId}/tags`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ tagIds: [tag.body.data.id] });

            expect(response.status).toBe(201);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].name).toBe('test-tag-nodejs');
        });

        it('should return 404 when attaching a non-existent tagId', async () => {
            const response = await request(app)
                .post(`/api/v1/posts/${testPostId}/tags`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ tagIds: ['non-existent-tag-id'] });

            expect(response.status).toBe(404);
        });

        it('should not duplicate the junction row when the same tag is attached twice', async () => {
            const tag = await request(app)
                .post('/api/v1/tags')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'test-tag-react' });

            await request(app)
                .post(`/api/v1/posts/${testPostId}/tags`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ tagIds: [tag.body.data.id] });


            await request(app)
                .post(`/api/v1/posts/${testPostId}/tags`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ tagIds: [tag.body.data.id] });

            const rows = await prisma.tagsOnPosts.findMany({
                where: { postId: testPostId, tagId: tag.body.data.id },
            });

            expect(rows).toHaveLength(1);
        });
    });

    describe('GET /api/v1/posts/:id - tags included', () => {
        it('should include attached tags when fetching a single post', async () => {
            const tag = await request(app)
                .post('/api/v1/tags')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'test-tag-vitest' });

            await request(app)
                .post(`/api/v1/posts/${testPostId}/tags`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ tagIds: [tag.body.data.id] });

            const response = await request(app)
                .get(`/api/v1/posts/${testPostId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.tags).toHaveLength(1);
            expect(response.body.data.tags[0].name).toBe('test-tag-vitest');
        });
    });

    describe('DELETE /api/v1/posts/:postId/tags/:tagId - detach', () => {
        it('should remove the tag from the post', async () => {
            const tag = await request(app)
                .post('/api/v1/tags')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'test-tag-detach' });

            await request(app)
                .post(`/api/v1/posts/${testPostId}/tags`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ tagIds: [tag.body.data.id] });

            const response = await request(app)
                .delete(`/api/v1/posts/${testPostId}/tags/${tag.body.data.id}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(204);

            const rows = await prisma.tagsOnPosts.findMany({
                where: { postId: testPostId, tagId: tag.body.data.id },
            });
            expect(rows).toHaveLength(0);
        });
    });
});