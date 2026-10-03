import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditService } from '../../src/modules/audit/audit.service';
import { prisma } from '../../src/lib/prisma';

describe('AuditService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log()', () => {
    it('should create an audit log entry in the database', async () => {
      const createSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({
        id: 'audit-1',
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'AUTH_LOGIN_SUCCESS',
        resource: 'User',
        resourceId: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: { foo: 'bar' },
        createdAt: new Date(),
      } as any);

      await auditService.log({
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'AUTH_LOGIN_SUCCESS',
        resource: 'User',
        resourceId: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: { foo: 'bar' },
      });

      expect(createSpy).toHaveBeenCalledWith({
        data: {
          action: 'AUTH_LOGIN_SUCCESS',
          organizationId: 'org-1',
          userId: 'user-1',
          resource: 'User',
          resourceId: 'user-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          metadata: { foo: 'bar' },
        },
      });

      createSpy.mockRestore();
    });

    it('should handle errors silently without throwing', async () => {
      const createSpy = vi.spyOn(prisma.auditLog, 'create').mockRejectedValueOnce(new Error('DB error'));

      await expect(
        auditService.log({
          action: 'AUTH_LOGIN_FAILURE',
        })
      ).resolves.not.toThrow();

      createSpy.mockRestore();
    });
  });

  describe('list()', () => {
    it('should query audit logs with pagination and filters', async () => {
      const mockLogs = [
        {
          id: 'audit-1',
          organizationId: 'org-1',
          userId: 'user-1',
          action: 'AUTH_LOGIN_SUCCESS',
          resource: 'User',
          resourceId: 'user-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          metadata: null,
          createdAt: new Date('2026-10-03T12:00:00.000Z'),
        },
      ];

      const findManySpy = vi.spyOn(prisma.auditLog, 'findMany').mockResolvedValueOnce(mockLogs as any);
      const countSpy = vi.spyOn(prisma.auditLog, 'count').mockResolvedValueOnce(1);

      const result = await auditService.list({
        organizationId: 'org-1',
        action: 'AUTH_LOGIN_SUCCESS',
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0]?.action).toBe('AUTH_LOGIN_SUCCESS');

      findManySpy.mockRestore();
      countSpy.mockRestore();
    });
  });
});
