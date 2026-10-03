import { Router } from 'express';
import { userController } from '../../../../modules/users/user.controller';
import { authenticate } from '../../../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/me', (req, res, next) => userController.getMe(req, res, next));
router.patch('/me', (req, res, next) => userController.updateMe(req, res, next));

export default router;
