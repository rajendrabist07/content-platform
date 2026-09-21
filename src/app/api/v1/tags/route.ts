import { Router } from 'express';
import { tagController } from '../../../../modules/tags/tag.controller';
import { authenticate } from '../../../../middleware/authenticate';

const router = Router();

router.post('/', authenticate, (req, res, next) => tagController.create(req, res, next));
router.get('/', authenticate, (req, res, next) => tagController.list(req, res, next));

export default router;