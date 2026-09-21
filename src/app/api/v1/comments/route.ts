import { Router } from 'express';
import { commentController } from '../../../../modules/comments/comment.controller';
import { authenticate } from '../../../../middleware/authenticate';

const router = Router({ mergeParams: true }); // postId parent route bata paune

router.post('/', authenticate, (req, res, next) => commentController.create(req, res, next));
router.get('/', authenticate, (req, res, next) => commentController.list(req, res, next));
router.patch('/:id', authenticate, (req, res, next) => commentController.update(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => commentController.delete(req, res, next));

export default router;