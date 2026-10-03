import type { Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { UnauthorizedError } from '../../core/errors/HttpError';

class AuditController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const action = req.query.action as string | undefined;
      const userId = req.query.userId as string | undefined;

      // Scope to the user's organization for multi-tenant isolation
      const organizationId = req.user.organizationId;

      const { logs, total } = await auditService.list({
        organizationId,
        action,
        userId,
        page,
        limit,
      });

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
