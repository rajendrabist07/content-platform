import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { env } from '../../src/config/env';

const app = createApp();

describe('Email Verification Gating Middleware - Integration', () => {
  const testOrgId = 'test-org-email-gating';
  let unverifiedUserToken: string;
  let unverifiedUserId: string;
  let verifiedUserToken: string;
  let verifiedUserId: string;
  let samplePostId: string;
  const originalRequireVerified = env.REQUIRE_VERIFIED_EMAIL;

  beforeAll(async () => {
    await prisma.organization.upsert({
      where: { id: testOrgId },
      update: {},
      create: { id: testOrgId, name: 'Email Gating Org', slug: 'email-gating-org' },
    });
  });

  afterAll(async () => {
    (env as any).REQUIRE_VERIFIED_EMAIL = originalRequireVerified;
    await prisma.comment.deleteMany({ where: { author: { organizationId: testOrgId } } });
    await prisma.postLike.deleteMany({ where: { user: { organizationId: testOrgId } } });
    await prisma.bookmark.deleteMany({ where: { user: { organizationId: testOrgId } } });
    await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.refreshToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
    await prisma.authToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.delete({ where: { id: testOrgId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.comment.deleteMany({ where: { author: { organizationId: testOrgId } } });
    await prisma.postLike.deleteMany({ where: { user: { organizationId: testOrgId } } });
    await prisma.bookmark.deleteMany({ where: { user: { organizationId: testOrgId } } });
    await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.refreshToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
    await prisma.authToken.deleteMany({ where: { user: { organizationId: testOrgId } } });
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });

    // Register unverified user
    const unverifiedRes = await request(app).post('/api/v1/auth/register').send({
      email: `unverified-${Date.now()}@chronicle-test.com`,
      password: 'Password123!',
      name: 'Unverified User',
      organizationId: testOrgId,
    });
    unverifiedUserToken = unverifiedRes.body.data.accessToken;
    unverifiedUserId = unverifiedRes.body.data.user.id;

    // Register and verify a second user
    const verifiedRes = await request(app).post('/api/v1/auth/register').send({
      email: `verified-${Date.now()}@chronicle-test.com`,
      password: 'Password123!',
      name: 'Verified User',
      organizationId: testOrgId,
    });
    verifiedUserToken = verifiedRes.body.data.accessToken;
    verifiedUserId = verifiedRes.body.data.user.id;

    await prisma.user.update({
      where: { id: verifiedUserId },
      data: { emailVerifiedAt: new Date() },
    });

    // Create a base post by verified user for testing interactions
    const post = await prisma.post.create({
      data: {
        title: 'Gating Test Post',
        slug: `gating-test-post-${Date.now()}`,
        content: 'Testing verification gating on mutating actions.',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId: verifiedUserId,
        organizationId: testOrgId,
      },
    });
    samplePostId = post.id;
  });

  describe('When REQUIRE_VERIFIED_EMAIL is enabled (true)', () => {
    beforeEach(() => {
      (env as any).REQUIRE_VERIFIED_EMAIL = true;
    });

    it('should block unverified user from creating a post with 403', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${unverifiedUserToken}`)
        .send({
          title: 'Blocked Post',
          content: 'This should be blocked.',
          status: 'DRAFT',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe(
        'Email verification required. Please verify your email to perform this action.'
      );
    });

    it('should block unverified user from creating a comment with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/posts/${samplePostId}/comments`)
        .set('Authorization', `Bearer ${unverifiedUserToken}`)
        .send({
          content: 'This comment should be blocked.',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe(
        'Email verification required. Please verify your email to perform this action.'
      );
    });

    it('should block unverified user from liking a post with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/posts/${samplePostId}/like`)
        .set('Authorization', `Bearer ${unverifiedUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe(
        'Email verification required. Please verify your email to perform this action.'
      );
    });

    it('should block unverified user from bookmarking a post with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/posts/${samplePostId}/bookmark`)
        .set('Authorization', `Bearer ${unverifiedUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe(
        'Email verification required. Please verify your email to perform this action.'
      );
    });

    it('should allow verified user to perform mutating actions', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${verifiedUserToken}`)
        .send({
          title: 'Allowed Post by Verified User',
          content: 'This should be allowed.',
          status: 'DRAFT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('When REQUIRE_VERIFIED_EMAIL is disabled (false)', () => {
    beforeEach(() => {
      (env as any).REQUIRE_VERIFIED_EMAIL = false;
    });

    it('should allow unverified user to create post', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${unverifiedUserToken}`)
        .send({
          title: 'Unverified Allowed Post',
          content: 'This should be allowed when gating is disabled.',
          status: 'DRAFT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });
});
