import type { Report, Prisma, ReportStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface ReportPaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedReports {
  data: (Report & {
    reporter: { name: string };
    resolvedBy?: { name: string } | null;
  })[];
  total: number;
}

export class ReportRepository {
  async create(data: Prisma.ReportCreateInput): Promise<Report> {
    return prisma.report.create({
      data,
      include: {
        reporter: { select: { name: true } },
      },
    });
  }

  async findById(id: string): Promise<(Report & {
    reporter: { name: string };
    resolvedBy?: { name: string } | null;
  }) | null> {
    return prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: { name: true } },
        resolvedBy: { select: { name: true } },
      },
    });
  }

  async findExistingActiveReport(
    reporterId: string,
    targetType: 'POST' | 'COMMENT' | 'USER',
    targetId: string
  ): Promise<Report | null> {
    return prisma.report.findFirst({
      where: {
        reporterId,
        targetType,
        targetId,
        status: { in: ['OPEN'] },
      },
    });
  }

  async findMany(
    pagination: ReportPaginationParams,
    status?: ReportStatus
  ): Promise<PaginatedReports> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.ReportWhereInput = {
      ...(status ? { status } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
        include: {
          reporter: { select: { name: true } },
          resolvedBy: { select: { name: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return { data, total };
  }

  async update(id: string, data: Prisma.ReportUpdateInput): Promise<Report & {
    reporter: { name: string };
    resolvedBy?: { name: string } | null;
  }> {
    return prisma.report.update({
      where: { id },
      data,
      include: {
        reporter: { select: { name: true } },
        resolvedBy: { select: { name: true } },
      },
    });
  }
}

export const reportRepository = new ReportRepository();
