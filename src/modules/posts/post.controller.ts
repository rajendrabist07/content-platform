import { Request, Response, NextFunction } from 'express';
import { postService } from './post.service';
import { createPostSchema } from './post.validation';
import { toPostDTO } from './post.mapper';
import { ValidationError } from '../../core/errors/HttpError';

export class PostController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {

      const result = createPostSchema.safeParse(req.body);
      if (!result.success) {
        throw new ValidationError(result.error.issues[0].message);
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
      const post = await postService.publishPost(req.params.id, req.body.userId);
      res.status(200).json({ success: true, data: toPostDTO(post) });
    } catch (err) {
      next(err);
    }
  }
}

export const postController = new PostController();