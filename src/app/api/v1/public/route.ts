import { Router, type Request, type Response, type NextFunction } from 'express';
import { postService } from '../../../../modules/posts/post.service';
import { tagRepository } from '../../../../modules/tags/tag.repository';
import { toPostDTO } from '../../../../modules/posts/post.mapper';
import { ValidationError } from '../../../../core/errors/HttpError';

const router = Router();

router.get('/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');

    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const authorId = typeof req.query.authorId === 'string' ? req.query.authorId : undefined;
    const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;

    const result = await postService.getPublicPosts(
      { tag, search, authorId, organizationId },
      page,
      limit
    );

    res.status(200).json({
      success: true,
      data: result.data.map(toPostDTO),
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/posts/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=120');

    const slug = req.params.slug;
    if (!slug || typeof slug !== 'string') {
      throw new ValidationError('Post slug is required');
    }

    const post = await postService.getPublicPostBySlug(slug);

    res.status(200).json({
      success: true,
      data: toPostDTO(post),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/tags', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=1800');

    const tags = await tagRepository.findPublicTagsWithCount();

    res.status(200).json({
      success: true,
      data: tags,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/sitemap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=1800');

    const sitemap = await postService.getPublicSitemap();

    res.status(200).json({
      success: true,
      data: sitemap,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
