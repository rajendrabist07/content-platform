import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

const app = createApp();

describe('Audit Logs API - Integration', () => {
  const testOrgId = 'test-org-audit-integration';
  let ownerToken: string;
  let memberToken: string;
  let memberUserId: string;

  beforeAll(async () => {
    await prisma.organization.upsert({
      where: { id: testOrgId },
      update: {},
      create: { id: testOrgId, name: 'Audit Test Org', slug: 'audit-test-org' },
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({
      where: { OR: [{ organizationId: testOrgId }, { userId: { in: [memberUserId] } }] },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['auditowner@example.com', 'auditmember@example.com'] } },
    });
    await prisma.organization.deleteMany({
      where: { slug: { in: ['audit-test-org', 'audit-dedicated-org'] } },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: ['auditowner@example.com', 'auditmember@example.com'] } },
    });
    await prisma.organization.deleteMany({
      where: { slug: { in: ['audit-dedicated-org'] } },
    });

    // Register OWNER
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      email: 'auditowner@example.com',
      password: 'password123',
      name: 'Audit Owner',
      organizationName: 'Audit Dedicated Org',
    });
    ownerToken = ownerRes.body.data.accessToken;

    // Register MEMBER in testOrgId
    const memberRes = await request(app).post('/api/v1/auth/register').send({
      email: 'auditmember@example.com',
      password: 'password123',
      name: 'Audit Member',
      organizationId: testOrgId,
    });
    memberToken = memberRes.body.data.accessToken;
    memberUserId = memberRes.body.data.user.id;
  });

  describe('Audit Log Ingestion on Auth Events', () => {
    it('should log AUTH_LOGIN_SUCCESS when logging in with correct credentials', async () => {
      await request(app).post('/api/v1/auth/login').send({
        email: 'auditmember@example.com',
        password: 'password123',
      });

      const log = await prisma.auditLog.findFirst({
        where: {
          userId: memberUserId,
          action: 'AUTH_LOGIN_SUCCESS',
        },
      });

      expect(log).not.toBeNull();
      expect(log?.action).toBe('AUTH_LOGIN_SUCCESS');
      expect(log?.userId).toBe(memberUserId);
    });

    it('should log AUTH_LOGIN_FAILURE when logging in with invalid password', async () => {
      await request(app).post('/api/v1/auth/login').send({
        email: 'auditmember@example.com',
        password: 'wrongpassword',
      });

      const log = await prisma.auditLog.findFirst({
        where: {
          action: 'AUTH_LOGIN_FAILURE',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(log).not.toBeNull();
      expect(log?.action).toBe('AUTH_LOGIN_FAILURE');
      expect((log?.metadata as any)?.reason).toBe('invalid_credentials');
    });
  });

  describe('GET /api/v1/audit-logs', () => {
    it('should reject unauthenticated request with 401', async () => {
      const response = await request(app).get('/api/v1/audit-logs');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject MEMBER access with 403 Forbidden', async () => {
      const response = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('requires one of these roles');
    });

    it('should allow OWNER to list audit logs for their organization', async () => {
      const response = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });
  });
});
