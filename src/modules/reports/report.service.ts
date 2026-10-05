import type { ReportStatus } from '@prisma/client';
import { reportRepository } from './report.repository';
import type { CreateReportInput, UpdateReportInput } from './report.validation';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError, ConflictError } from '../../core/errors/HttpError';
import { auditService } from '../audit/audit.service';
import { logger } from '../../core/logger/logger';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export interface AuthContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export class ReportService {
  async createReport(reporterId: string, input: CreateReportInput, context?: AuthContext) {
    // 1. Verify target exists and prevent self-reporting
    if (input.targetType === 'POST') {
      const post = await prisma.post.findFirst({
        where: { id: input.targetId, deletedAt: null },
      });

      if (!post) {
        throw new NotFoundError('Post');
      }

      if (post.authorId === reporterId) {
        throw new ValidationError('You cannot report your own post');
      }
    } else if (input.targetType === 'COMMENT') {
      const comment = await prisma.comment.findFirst({
        where: { id: input.targetId, deletedAt: null },
      });

      if (!comment) {
        throw new NotFoundError('Comment');
      }

      if (comment.authorId === reporterId) {
        throw new ValidationError('You cannot report your own comment');
      }
    } else if (input.targetType === 'USER') {
      const targetUser = await prisma.user.findFirst({
        where: { id: input.targetId, deletedAt: null },
      });

      if (!targetUser) {
        throw new NotFoundError('User');
      }

      if (targetUser.id === reporterId) {
        throw new ValidationError('You cannot report your own account');
      }
    }

    // 2. Check for duplicate active reports
    const existing = await reportRepository.findExistingActiveReport(
      reporterId,
      input.targetType,
      input.targetId
    );

    if (existing) {
      throw new ConflictError('You have already submitted an active report for this item');
    }

    // 3. Create report
    const report = await reportRepository.create({
      reporter: { connect: { id: reporterId } },
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details ?? null,
      status: 'OPEN',
    });

    logger.info(
      { reportId: report.id, reporterId, targetType: input.targetType, targetId: input.targetId },
      'Report created'
    );

    auditService.log({
      action: 'REPORT_CREATED',
      userId: reporterId,
      resource: 'Report',
      resourceId: report.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: {
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
      },
    });

    return report;
  }

  async getReports(rawPage?: number, rawLimit?: number, status?: ReportStatus) {
    const page = this.sanitizePage(rawPage);
    const limit = this.sanitizeLimit(rawLimit);

    const { data, total } = await reportRepository.findMany({ page, limit }, status);
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async resolveReport(reportId: string, resolverId: string, input: UpdateReportInput, context?: AuthContext) {
    const existing = await reportRepository.findById(reportId);
    if (!existing) {
      throw new NotFoundError('Report');
    }

    const updated = await reportRepository.update(reportId, {
      status: input.status,
      resolutionNote: input.resolutionNote ?? null,
      resolvedBy: { connect: { id: resolverId } },
      resolvedAt: new Date(),
    });

    logger.info({ reportId, resolverId, status: input.status }, 'Report resolved/updated');

    auditService.log({
      action: 'REPORT_RESOLVED',
      userId: resolverId,
      resource: 'Report',
      resourceId: reportId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      metadata: {
        newStatus: input.status,
        resolutionNote: input.resolutionNote,
      },
    });

    return updated;
  }

  private sanitizePage(rawPage?: number): number {
    if (!rawPage || !Number.isInteger(rawPage) || rawPage < 1) {
      return DEFAULT_PAGE;
    }
    return rawPage;
  }

  private sanitizeLimit(rawLimit?: number): number {
    if (!rawLimit || !Number.isInteger(rawLimit) || rawLimit < 1) {
      return DEFAULT_LIMIT;
    }
    if (rawLimit > MAX_LIMIT) {
      return MAX_LIMIT;
    }
    return rawLimit;
  }
}

export const reportService = new ReportService();
