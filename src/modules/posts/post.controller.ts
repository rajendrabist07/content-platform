import type { Request, Response, NextFunction } from 'express';
import { postService } from './post.service';
import { createPostSchema, updatePostSchema } from './post.validation';
import { toPostDTO } from './post.mapper';
import { ValidationError, UnauthorizedError } from '../../core/errors/HttpError';

export class PostController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = createPostSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }

      const post = await postService.createPost(
        result.data,
        req.user.userId,
        req.user.organizationId
      );

      res.status(201).json({ success: true, data: toPostDTO(post) });
    } catch (err) {
      next(err);
    }
  }

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const postId = req.params.id;
      if (typeof postId !== 'string' || !postId) throw new ValidationError('Post id is required in URL');

      const post = await postService.publishPost(postId, req.user.userId, req.user.role);
      res.json({ success: true, data: toPostDTO(post) });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const result = await postService.getPosts(req.user.organizationId, page, limit);

      res.json({
        success: true,
        data: result.data.map(toPostDTO),
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const postId = req.params.id;
      if (typeof postId !== 'string' || !postId) {
        throw new ValidationError('Post id is required');
      }

      const post = await postService.getPostById(postId, req.user.organizationId);
      res.json({ success: true, data: toPostDTO(post) });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const postId = req.params.id;
      if (typeof postId !== 'string' || !postId) throw new ValidationError('Post id is required');

      const result = updatePostSchema.safeParse(req.body);
      if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');

      const post = await postService.updatePost(postId, req.user.userId, req.user.role, result.data);
      res.json({ success: true, data: toPostDTO(post) });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const postId = req.params.id;
      if (typeof postId !== 'string' || !postId) throw new ValidationError('Post id is required');

      await postService.deletePost(postId, req.user.userId, req.user.role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const postController = new PostController();