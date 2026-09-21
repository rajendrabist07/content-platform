import type { Request, Response, NextFunction } from 'express';
import { commentService } from './comment.service';
import { createCommentSchema, updateCommentSchema } from './comment.validation';
import { toCommentDTO } from './comment.mapper';
import { ValidationError, UnauthorizedError } from '../../core/errors/HttpError';

export class CommentController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new UnauthorizedError('Authentication required');

            const postId = req.params.postId;
            if (typeof postId !== 'string' || !postId) {
                throw new ValidationError('Post id is required');
            }

            const result = createCommentSchema.safeParse(req.body);
            if (!result.success) {
                throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
            }

            const comment = await commentService.createComment(postId, req.user.userId, result.data);
            res.status(201).json({ success: true, data: toCommentDTO(comment) });
        } catch (err) {
            next(err);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new UnauthorizedError('Authentication required');

            const postId = req.params.postId;
            if (typeof postId !== 'string' || !postId) {
                throw new ValidationError('Post id is required');
            }

            const comments = await commentService.getComments(postId);
            res.json({ success: true, data: comments.map(toCommentDTO) });
        } catch (err) {
            next(err);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new UnauthorizedError('Authentication required');
            const commentId = req.params.id;
            if (typeof commentId !== 'string' || !commentId) throw new ValidationError('Comment id is required');

            const result = updateCommentSchema.safeParse(req.body);
            if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');

            const comment = await commentService.updateComment(commentId, req.user.userId, req.user.role, result.data);
            res.json({ success: true, data: toCommentDTO(comment) });
        } catch (err) {
            next(err);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new UnauthorizedError('Authentication required');
            const commentId = req.params.id;
            if (typeof commentId !== 'string' || !commentId) throw new ValidationError('Comment id is required');

            await commentService.deleteComment(commentId, req.user.userId, req.user.role);
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    }
}
export const commentController = new CommentController();