import { Router } from 'express';
import { postController } from '../../../../modules/posts/post.controller';
import { comprehensionController } from '../../../../modules/comprehension/comprehension.controller';
import { authenticate } from '../../../../middleware/authenticate';
import { optionalAuthenticate } from '../../../../middleware/optionalAuthenticate';
import { requireVerifiedEmail } from '../../../../middleware/requireVerifiedEmail';
import { tagController } from '../../../../modules/tags/tag.controller';

const router = Router();

router.get('/', authenticate, (req, res, next) => postController.list(req, res, next));
router.get('/:id', authenticate, (req, res, next) => postController.getOne(req, res, next));
router.post('/', authenticate, requireVerifiedEmail, (req, res, next) => postController.create(req, res, next));
router.patch('/:id/publish', authenticate, requireVerifiedEmail, (req, res, next) => postController.publish(req, res, next));
router.patch('/:id', authenticate, requireVerifiedEmail, (req, res, next) => postController.update(req, res, next));
router.delete('/:id', authenticate, requireVerifiedEmail, (req, res, next) => postController.delete(req, res, next));

router.post('/:id/like', authenticate, requireVerifiedEmail, (req, res, next) => postController.like(req, res, next));
router.delete('/:id/like', authenticate, requireVerifiedEmail, (req, res, next) => postController.unlike(req, res, next));
router.post('/:id/bookmark', authenticate, requireVerifiedEmail, (req, res, next) => postController.bookmark(req, res, next));
router.delete('/:id/bookmark', authenticate, requireVerifiedEmail, (req, res, next) => postController.unbookmark(req, res, next));

router.post('/:postId/tags', authenticate, requireVerifiedEmail, (req, res, next) => tagController.attachToPost(req, res, next));
router.delete('/:postId/tags/:tagId', authenticate, requireVerifiedEmail, (req, res, next) => tagController.detachFromPost(req, res, next));

// Comprehension Layer: Grounded Quiz & Q&A
router.post('/:postId/quiz/generate', authenticate, (req, res, next) =>
  comprehensionController.generateQuiz(req, res, next)
);
router.get('/:postId/quiz', (req, res, next) =>
  comprehensionController.getQuiz(req, res, next)
);
router.post('/:postId/quiz/attempt', optionalAuthenticate, (req, res, next) =>
  comprehensionController.submitAttempt(req, res, next)
);
router.post('/:postId/ask', optionalAuthenticate, (req, res, next) =>
  comprehensionController.askArticle(req, res, next)
);
router.get('/:postId/analytics/comprehension', authenticate, (req, res, next) =>
  comprehensionController.getAnalytics(req, res, next)
);

export default router;