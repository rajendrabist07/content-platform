import type { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { createReportSchema } from './report.validation';
import { toReportDTO } from './report.mapper';
import { ValidationError, UnauthorizedError } from '../../core/errors/HttpError';

export class ReportController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = createReportSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const context = { ipAddress: req.ip, userAgent: req.get('user-agent') };
      const report = await reportService.createReport(req.user.userId, result.data, context);

      res.status(201).json({
        success: true,
        message: 'Report submitted successfully. Our moderation team will review it.',
        data: toReportDTO(report),
      });
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
