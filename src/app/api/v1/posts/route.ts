import { Router } from 'express';
import { postController } from '../../../../modules/posts/post.controller';
import { authenticate } from '../../../../middleware/authenticate';
import { tagController } from '../../../../modules/tags/tag.controller';

const router = Router();

router.get('/', authenticate, (req, res, next) => postController.list(req, res, next));
router.get('/:id', authenticate, (req, res, next) => postController.getOne(req, res, next));
router.post('/', authenticate, (req, res, next) => postController.create(req, res, next));
router.patch('/:id/publish', authenticate, (req, res, next) => postController.publish(req, res, next));
router.patch('/:id', authenticate, (req, res, next) => postController.update(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => postController.delete(req, res, next));

router.post('/:postId/tags', authenticate, (req, res, next) => tagController.attachToPost(req, res, next));
router.delete('/:postId/tags/:tagId', authenticate, (req, res, next) => tagController.detachFromPost(req, res, next));

export default router;