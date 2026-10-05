import { Router } from 'express';
import { moderationController } from '../../../../modules/moderation/moderation.controller';
import { authenticate } from '../../../../middleware/authenticate';
import { authorize } from '../../../../middleware/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'OWNER'));

// Moderation queue
router.get('/moderation/queue', (req, res, next) =>
  moderationController.getQueue(req, res, next)
);

// Post moderation
router.post('/posts/:id/approve', (req, res, next) =>
  moderationController.approvePost(req, res, next)
);
router.post('/posts/:id/reject', (req, res, next) =>
  moderationController.rejectPost(req, res, next)
);
router.post('/posts/:id/unpublish', (req, res, next) =>
  moderationController.unpublishPost(req, res, next)
);

// Reports moderation
router.patch('/reports/:id', (req, res, next) =>
  moderationController.updateReport(req, res, next)
);

// User moderation & trust levels
router.post('/users/:id/suspend', (req, res, next) =>
  moderationController.suspendUser(req, res, next)
);
router.post('/users/:id/restore', (req, res, next) =>
  moderationController.restoreUser(req, res, next)
);
router.post('/users/:id/set-trust-level', (req, res, next) =>
  moderationController.setUserTrustLevel(req, res, next)
);

export default router;
