import type { ReportTarget, ReportReason, ReportStatus } from '@prisma/client';

export interface ReportResponseDTO {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reporterId: string;
  reporterName?: string;
  resolvedById?: string | null;
  resolvedByName?: string | null;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
