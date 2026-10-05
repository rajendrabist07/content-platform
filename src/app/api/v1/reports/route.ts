import { Router } from 'express';
import { reportController } from '../../../../modules/reports/report.controller';
import { authenticate } from '../../../../middleware/authenticate';
import { requireVerifiedEmail } from '../../../../middleware/requireVerifiedEmail';
import { authActionLimiter } from '../../../../middleware/rateLimiter';

const router = Router();

router.post(
  '/',
  authenticate,
  requireVerifiedEmail,
  authActionLimiter,
  (req, res, next) => reportController.create(req, res, next)
);

export default router;
