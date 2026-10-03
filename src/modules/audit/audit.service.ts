import { prisma } from '../../lib/prisma';
import { logger } from '../../core/logger/logger';
import type { LogAuditEventInput, AuditLogDTO } from './audit.dto';
import type { Prisma } from '@prisma/client';

export class AuditService {
  async log(event: LogAuditEventInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: event.action,
          organizationId: event.organizationId ?? null,
          userId: event.userId ?? null,
          resource: event.resource ?? null,
          resourceId: event.resourceId ?? null,
          ipAddress: event.ipAddress ?? null,
          userAgent: event.userAgent ?? null,
          metadata: (event.metadata ?? null) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      logger.error({ err, action: event.action }, 'Failed to record audit log');
    }
  }

  async list(params: {
    organizationId?: string | undefined;
    userId?: string | undefined;
    action?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
  }): Promise<{ logs: AuditLogDTO[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(params.organizationId ? { organizationId: params.organizationId } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.action ? { action: params.action } : {}),
    };

    const [records, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const logs: AuditLogDTO[] = records.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      userId: r.userId,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    }));

    return { logs, total };
  }
}

export const auditService = new AuditService();
