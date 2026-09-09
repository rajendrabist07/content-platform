import type { Request, Response, NextFunction } from 'express';
import { postService } from './post.service';
import { createPostSchema } from './post.validation';
import { toPostDTO } from './post.mapper';
import { ValidationError } from '../../core/errors/HttpError';

export class PostController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {

      const result = createPostSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
      }



      const post = await postService.createPost(
        result.data,
        req.body.authorId,       
        req.body.organizationId  
      );


      res.status(201).json({ success: true, data: toPostDTO(post) });
    } catch (err) {
      next(err); 
    }
  }

 async publish(req: Request, res: Response, next: NextFunction) {
  try {
    const postId = req.params.id;
    if (typeof postId !== 'string' || !postId) {
      throw new ValidationError('Post id is required in URL');
    }

    const userId = req.body.userId;
    if (typeof userId !== 'string' || !userId) {
      throw new ValidationError('userId is required and must be a string');
    }

    const post = await postService.publishPost(postId, userId);
    res.json({ success: true, data: toPostDTO(post) });
  } catch (err) {
    next(err);
  }
}
}

export const postController = new PostController();