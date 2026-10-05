import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

const app = createApp();

describe('Security & Trust API - Integration', () => {
  const testOrgId = 'test-org-security-integration';
  let userToken: string;
  let userId: string;
  let userEmail: string;

  beforeAll(async () => {
    await prisma.organization.upsert({
      where: { id: testOrgId },
      update: {},
      create: { id: testOrgId, name: 'Security Test Org', slug: 'security-test-org' },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.delete({ where: { id: testOrgId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.post.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });

    userEmail = `secuser-${Date.now()}@chronicle-test.com`;
    const res = await request(app).post('/api/v1/auth/register').send({
      email: userEmail,
      password: 'Password123!',
      name: 'Security User',
      organizationId: testOrgId,
    });

    userToken = res.body.data.accessToken;
    userId = res.body.data.user.id;
  });

  describe('Disposable Email Protection', () => {
    it('should reject registration with disposable email domain', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'spammer@mailinator.com',
        password: 'Password123!',
        name: 'Spammer User',
        organizationId: testOrgId,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Please provide a valid and active email address/i);
    });
  });

  describe('Account Suspension Enforcement', () => {
    it('should reject login for suspended user with 403 Forbidden', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: userEmail,
        password: 'Password123!',
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/suspended/i);
    });

    it('should reject authenticated API requests for suspended user with 403 Forbidden', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/suspended/i);
    });
  });

  describe('Content Link & Trust Validation', () => {
    it('should reject markdown links with dangerous schemes like javascript:', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Malicious Links Post',
          content: 'Here is a dangerous link: [Click here](javascript:alert(1)) to test.',
          status: 'DRAFT',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Only HTTP and HTTPS URLs are permitted/i);
    });

    it('should reject content exceeding link cap for NEW trust level', async () => {
      const contentWithTooManyLinks = `
        [Link 1](https://example.com/1)
        [Link 2](https://example.com/2)
        [Link 3](https://example.com/3)
        [Link 4](https://example.com/4)
        [Link 5](https://example.com/5)
        [Link 6](https://example.com/6)
      `;

      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Too Many Links Post',
          content: contentWithTooManyLinks,
          status: 'DRAFT',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/exceeds maximum permitted links/i);
    });

    it('should place posts created with PUBLISHED status by NEW users into PENDING_REVIEW', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'New Author First Article',
          content: 'This is a genuine article written with [Documentation](https://chronicle.example.com).',
          status: 'PUBLISHED',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING_REVIEW');
      expect(res.body.data.publishedAt).toBeNull();
    });
  });

  describe('Session Lifecycle Management', () => {
    it('should list active sessions and revoke a specific session', async () => {
      const listRes = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      const sessionId = listRes.body.data[0].id;

      const deleteRes = await request(app)
        .delete(`/api/v1/auth/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });
});
