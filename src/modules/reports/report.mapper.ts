import type { Report, User } from '@prisma/client';
import type { ReportResponseDTO } from './report.dto';

type ReportWithRelations = Report & {
  reporter?: { name: string };
  resolvedBy?: { name: string } | null;
};

export function toReportDTO(report: ReportWithRelations): ReportResponseDTO {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    details: report.details,
    status: report.status,
    reporterId: report.reporterId,
    ...(report.reporter ? { reporterName: report.reporter.name } : {}),
    ...(report.resolvedById ? { resolvedById: report.resolvedById } : { resolvedById: null }),
    ...(report.resolvedBy ? { resolvedByName: report.resolvedBy.name } : {}),
    resolutionNote: report.resolutionNote ?? null,
    resolvedAt: report.resolvedAt ? report.resolvedAt.toISOString() : null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
