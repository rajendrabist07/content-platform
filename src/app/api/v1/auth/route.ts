import { Router } from 'express';
import { authController } from '../../../../modules/auth/auth.controller';
import { loginLimiter, authActionLimiter } from '../../../../middleware/rateLimiter';
import { authenticate } from '../../../../middleware/authenticate';

const router = Router();

router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

router.get('/verify-email', (req, res, next) => authController.verifyEmail(req, res, next));
router.post('/verify-email', (req, res, next) => authController.verifyEmail(req, res, next));
router.post('/resend-verification', authActionLimiter, (req, res, next) =>
  authController.resendVerification(req, res, next)
);
router.post('/forgot-password', authActionLimiter, (req, res, next) =>
  authController.forgotPassword(req, res, next)
);
router.post('/reset-password', (req, res, next) =>
  authController.resetPassword(req, res, next)
);
router.post('/change-password', authenticate, (req, res, next) =>
  authController.changePassword(req, res, next)
);

// Session management
router.get('/sessions', authenticate, (req, res, next) =>
  authController.getSessions(req, res, next)
);
router.delete('/sessions/:id', authenticate, (req, res, next) =>
  authController.revokeSession(req, res, next)
);
router.post('/sessions/revoke-all-others', authenticate, (req, res, next) =>
  authController.revokeAllOtherSessions(req, res, next)
);

export default router;