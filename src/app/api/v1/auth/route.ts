import { Router } from 'express';
import { authController } from '../../../../modules/auth/auth.controller';

const router = Router();

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));

export default router;