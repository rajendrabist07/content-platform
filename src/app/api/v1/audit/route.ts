import { Router } from 'express';
import { auditController } from '../../../../modules/audit/audit.controller';
import { authenticate } from '../../../../middleware/authenticate';
import { authorize } from '../../../../middleware/authorize';

const router = Router();

router.get(
  '/audit-logs',
  authenticate,
  authorize('OWNER', 'ADMIN'),
  (req, res, next) => auditController.list(req, res, next)
);

export { router as auditRouter };

