import { Router } from 'express';
import { authController } from '../../../../modules/auth/auth.controller';
import { loginLimiter } from '../../../../middleware/rateLimiter';

const router = Router();

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

export default router;