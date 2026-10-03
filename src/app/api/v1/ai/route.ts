import { Router } from 'express';
import { aiController } from '../../../../modules/ai/ai.controller';
import { authenticate } from '../../../../middleware/authenticate';
import { aiLimiter } from '../../../../middleware/rateLimiter';

const router = Router();

router.post('/suggest', authenticate, aiLimiter, (req, res, next) => aiController.suggest(req, res, next));

export default router;
