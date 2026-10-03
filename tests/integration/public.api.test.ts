import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

const app = createApp();

describe('Public API & SEO Slugs - Integration', () => {
    const testOrgId = 'test-org-public-integration';
    let userToken: string;
    let userId: string;
    let publishedPostSlug: string;
    let draftPostSlug: string;

    beforeAll(async () => {
        await prisma.organization.upsert({
            where: { id: testOrgId },
            update: {},
            create: { id: testOrgId, name: 'Public Test Org', slug: 'public-test-org' },
        });
    });

    afterAll(async () => {
        await prisma.tagsOnPosts.deleteMany({ where: { post: { organizationId: testOrgId } } });
        await prisma.comment.deleteMany({ where: { post: { organizationId: testOrgId } } });
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.authToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.organization.delete({ where: { id: testOrgId } });
        await prisma.$disconnect();
    });

    beforeEach(async () => {
        await prisma.tagsOnPosts.deleteMany({ where: { post: { organizationId: testOrgId } } });
        await prisma.comment.deleteMany({ where: { post: { organizationId: testOrgId } } });
        await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.authToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.refreshToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
        await prisma.user.deleteMany({ where: { organizationId: testOrgId } });

        const userRes = await request(app).post('/api/v1/auth/register').send({
            email: 'author@publictest.com',
            password: 'password123',
            name: 'Public Author',
            organizationId: testOrgId,
        });
        userToken = userRes.body.data.accessToken;
        userId = userRes.body.data.user.id;

        // Create a published post
        const pubPost = await request(app)
            .post('/api/v1/posts')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                title: 'Mastering TypeScript Architecture',
                content: 'Full comprehensive guide to mastering TypeScript in enterprise applications.',
                status: 'PUBLISHED',
            });
        publishedPostSlug = pubPost.body.data.slug;

        // Create a draft post
        const drfPost = await request(app)
            .post('/api/v1/posts')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                title: 'Draft Post In Progress',
                content: 'This draft should not be publicly accessible.',
                status: 'DRAFT',
            });
        draftPostSlug = drfPost.body.data.slug;
    });

    describe('GET /api/v1/public/posts', () => {
        it('should list only PUBLISHED posts without authentication', async () => {
            const res = await request(app).get(`/api/v1/public/posts?organizationId=${testOrgId}`);

            expect(res.status).toBe(200);
            expect(res.headers['cache-control']).toContain('public');
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].slug).toBe(publishedPostSlug);
            expect(res.body.data[0].authorName).toBe('Public Author');
        });

        it('should filter public posts by search keyword', async () => {
            const matchRes = await request(app).get(`/api/v1/public/posts?organizationId=${testOrgId}&search=TypeScript`);
            expect(matchRes.status).toBe(200);
            expect(matchRes.body.data.length).toBe(1);

            const noMatchRes = await request(app).get(`/api/v1/public/posts?organizationId=${testOrgId}&search=RubyOnRails`);
            expect(noMatchRes.status).toBe(200);
            expect(noMatchRes.body.data.length).toBe(0);
        });
    });

    describe('GET /api/v1/public/posts/:slug', () => {
        it('should return published post by slug with caching headers', async () => {
            const res = await request(app).get(`/api/v1/public/posts/${publishedPostSlug}`);

            expect(res.status).toBe(200);
            expect(res.headers['cache-control']).toContain('public');
            expect(res.body.success).toBe(true);
            expect(res.body.data.slug).toBe(publishedPostSlug);
            expect(res.body.data.authorName).toBe('Public Author');
        });

        it('should return 404 when trying to publicly access a DRAFT post', async () => {
            const res = await request(app).get(`/api/v1/public/posts/${draftPostSlug}`);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/v1/public/tags & /public/sitemap', () => {
        it('should return public tags with post counts', async () => {
            const res = await request(app).get('/api/v1/public/tags');

            expect(res.status).toBe(200);
            expect(res.headers['cache-control']).toContain('public');
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should return public sitemap URLs for SEO', async () => {
            const res = await request(app).get('/api/v1/public/sitemap');

            expect(res.status).toBe(200);
            expect(res.headers['cache-control']).toContain('public');
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            const found = res.body.data.find((item: { slug: string; url: string }) => item.slug === publishedPostSlug);
            expect(found).toBeDefined();
            expect(found.url).toContain(`/posts/${publishedPostSlug}`);
        });
    });

    describe('Slug Collision & Immutability', () => {
        it('should generate a unique suffixed slug on duplicate title', async () => {
            const dupPost = await request(app)
                .post('/api/v1/posts')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    title: 'Mastering TypeScript Architecture',
                    content: 'Another post with the exact same title in the same organization.',
                });

            expect(dupPost.status).toBe(201);
            expect(dupPost.body.data.slug).not.toBe(publishedPostSlug);
            expect(dupPost.body.data.slug).toContain('mastering-typescript-architecture-');
        });

        it('should keep slug immutable when updating a PUBLISHED post title', async () => {
            const updateRes = await request(app)
                .patch(`/api/v1/posts/${(await prisma.post.findFirst({ where: { slug: publishedPostSlug } }))?.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    title: 'Brand New Title That Changes',
                });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.slug).toBe(publishedPostSlug); // Slug did not change!
        });
    });
});
