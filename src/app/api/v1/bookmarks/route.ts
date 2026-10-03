import { Router, type Request, type Response, type NextFunction } from 'express';
import { postService } from '../../../../modules/posts/post.service';
import { toPostDTO } from '../../../../modules/posts/post.mapper';
import { authenticate } from '../../../../middleware/authenticate';
import { UnauthorizedError } from '../../../../core/errors/HttpError';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await postService.getBookmarks(req.user.userId, page, limit);

    res.status(200).json({
      success: true,
      data: result.data.map(toPostDTO),
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
