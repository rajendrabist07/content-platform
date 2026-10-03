import type { Prisma } from '@prisma/client';

export interface AuditLogDTO {
  id: string;
  organizationId: string | null;
  userId: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: string;
}

export interface LogAuditEventInput {
  organizationId?: string | undefined;
  userId?: string | undefined;
  action: string;
  resource?: string | undefined;
  resourceId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}
