import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

const app = createApp();

describe('Moderation & Reports API - Integration', () => {
  const testOrgId = 'test-org-moderation-integration';
  let adminToken: string;
  let adminId: string;
  let authorToken: string;
  let authorId: string;
  let reporterToken: string;
  let reporterId: string;

  beforeAll(async () => {
    await prisma.organization.upsert({
      where: { id: testOrgId },
      update: {},
      create: { id: testOrgId, name: 'Moderation Test Org', slug: 'moderation-test-org' },
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.delete({ where: { id: testOrgId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.report.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });

    // 1. Admin user
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      email: `admin-${Date.now()}@chronicle-mod.com`,
      password: 'Password123!',
      name: 'Admin User',
      organizationId: testOrgId,
    });
    adminToken = adminRes.body.data.accessToken;
    adminId = adminRes.body.data.user.id;
    // Set role to ADMIN and verify email
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'ADMIN', emailVerifiedAt: new Date() },
    });

    // 2. Author user (NEW trust level)
    const authorRes = await request(app).post('/api/v1/auth/register').send({
      email: `author-${Date.now()}@chronicle-mod.com`,
      password: 'Password123!',
      name: 'Author User',
      organizationId: testOrgId,
    });
    authorToken = authorRes.body.data.accessToken;
    authorId = authorRes.body.data.user.id;
    await prisma.user.update({
      where: { id: authorId },
      data: { emailVerifiedAt: new Date() },
    });

    // 3. Reporter user
    const reporterRes = await request(app).post('/api/v1/auth/register').send({
      email: `reporter-${Date.now()}@chronicle-mod.com`,
      password: 'Password123!',
      name: 'Reporter User',
      organizationId: testOrgId,
    });
    reporterToken = reporterRes.body.data.accessToken;
    reporterId = reporterRes.body.data.user.id;
    await prisma.user.update({
      where: { id: reporterId },
      data: { emailVerifiedAt: new Date() },
    });
  });

  describe('Content Reporting API', () => {
    it('should submit a report on another author post', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'Reportable Post',
          slug: `reportable-${Date.now()}`,
          content: 'This post contains unwanted promotional spam.',
          status: 'PUBLISHED',
          authorId,
          organizationId: testOrgId,
        },
      });

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          targetType: 'POST',
          targetId: post.id,
          reason: 'SPAM',
          details: 'Suspicious commercial links found.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.targetType).toBe('POST');
      expect(res.body.data.status).toBe('OPEN');
    });

    it('should reject self-reporting of own content with 400 Bad Request', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'My Own Post',
          slug: `my-own-${Date.now()}`,
          content: 'I wrote this post myself.',
          status: 'PUBLISHED',
          authorId,
          organizationId: testOrgId,
        },
      });

      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          targetType: 'POST',
          targetId: post.id,
          reason: 'SPAM',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot report your own post/i);
    });

    it('should reject duplicate active reports from the same user on the same item with 409 Conflict', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'Duplicate Target Post',
          slug: `dup-target-${Date.now()}`,
          content: 'Some controversial content.',
          status: 'PUBLISHED',
          authorId,
          organizationId: testOrgId,
        },
      });

      // First report
      const firstRes = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          targetType: 'POST',
          targetId: post.id,
          reason: 'HARASSMENT',
        });
      expect(firstRes.status).toBe(201);

      // Duplicate report
      const dupRes = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({
          targetType: 'POST',
          targetId: post.id,
          reason: 'HARASSMENT',
        });
      expect(dupRes.status).toBe(409);
      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.message).toMatch(/already submitted an active report/i);
    });

    it('should automatically quarantine a post into PENDING_REVIEW when 3 distinct users report it', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'Spammy Flagged Post',
          slug: `flagged-${Date.now()}`,
          content: 'This post is spam and should be flagged by multiple users.',
          status: 'PUBLISHED',
          authorId,
          organizationId: testOrgId,
        },
      });

      // Reporter 1
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${reporterToken}`)
        .send({ targetType: 'POST', targetId: post.id, reason: 'SPAM' });

      // Create Reporter 2
      const rep2Res = await request(app).post('/api/v1/auth/register').send({
        email: `rep2-${Date.now()}@chronicle-mod.com`,
        password: 'Password123!',
        name: 'Reporter 2',
        organizationId: testOrgId,
      });
      await prisma.user.update({
        where: { id: rep2Res.body.data.user.id },
        data: { emailVerifiedAt: new Date() },
      });
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${rep2Res.body.data.accessToken}`)
        .send({ targetType: 'POST', targetId: post.id, reason: 'SPAM' });

      // Create Reporter 3
      const rep3Res = await request(app).post('/api/v1/auth/register').send({
        email: `rep3-${Date.now()}@chronicle-mod.com`,
        password: 'Password123!',
        name: 'Reporter 3',
        organizationId: testOrgId,
      });
      await prisma.user.update({
        where: { id: rep3Res.body.data.user.id },
        data: { emailVerifiedAt: new Date() },
      });
      await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${rep3Res.body.data.accessToken}`)
        .send({ targetType: 'POST', targetId: post.id, reason: 'SPAM' });

      // Verify post has been automatically updated to PENDING_REVIEW
      const updatedPost = await prisma.post.findUnique({ where: { id: post.id } });
      expect(updatedPost?.status).toBe('PENDING_REVIEW');
      expect(updatedPost?.rejectionReason).toContain('community reports');
    });
  });

  describe('Admin Moderation Queue & Post Reviews', () => {
    it('should reject non-admin users from accessing /api/v1/admin routes with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/moderation/queue')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to view queue, approve post, and reject post', async () => {
      const post = await prisma.post.create({
        data: {
          title: 'Pending Review Post',
          slug: `pending-review-${Date.now()}`,
          content: 'A high-quality technical tutorial awaiting review.',
          status: 'PENDING_REVIEW',
          authorId,
          organizationId: testOrgId,
        },
      });

      // 1. Get queue
      const queueRes = await request(app)
        .get('/api/v1/admin/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(queueRes.status).toBe(200);
      expect(queueRes.body.data.pendingPosts.total).toBeGreaterThanOrEqual(1);

      // 2. Approve post
      const approveRes = await request(app)
        .post(`/api/v1/admin/posts/${post.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('PUBLISHED');
      expect(approveRes.body.data.publishedAt).not.toBeNull();

      // 3. Reject another post
      const rejectedPost = await prisma.post.create({
        data: {
          title: 'Low Quality Post',
          slug: `low-quality-${Date.now()}`,
          content: 'Spammy content without technical depth.',
          status: 'PENDING_REVIEW',
          authorId,
          organizationId: testOrgId,
        },
      });

      const rejectRes = await request(app)
        .post(`/api/v1/admin/posts/${rejectedPost.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Insufficient technical depth and inappropriate formatting.' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('REJECTED');
      expect(rejectRes.body.data.rejectionReason).toMatch(/technical depth/i);
    });

    it('should allow admin to suspend user and change trust level', async () => {
      // 1. Change trust level
      const trustRes = await request(app)
        .post(`/api/v1/admin/users/${authorId}/set-trust-level`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ trustLevel: 'TRUSTED' });

      expect(trustRes.status).toBe(200);
      expect(trustRes.body.data.trustLevel).toBe('TRUSTED');

      // 2. Suspend user
      const suspendRes = await request(app)
        .post(`/api/v1/admin/users/${authorId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Malicious behavior' });

      expect(suspendRes.status).toBe(200);

      // Verify suspended user is blocked from making requests
      const blockedRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authorToken}`);

      expect(blockedRes.status).toBe(403);
    });
  });
});
