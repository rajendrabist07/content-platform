import { Router } from 'express';
import { postController } from '../../../../modules/posts/post.controller';

const router = Router();

router.post('/', (req, res, next) => postController.create(req, res, next));
router.patch('/:id/publish', (req, res, next) => postController.publish(req, res, next));

export default router;