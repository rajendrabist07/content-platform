import type { Prisma } from '@prisma/client';
import { commentRepository } from './comment.repository';
import { postRepository } from '../posts/post.repository';
import { NotFoundError, ForbiddenError } from '../../core/errors/HttpError';
import type { CreateCommentInput, UpdateCommentInput } from './comment.validation';
import { logger } from '../../core/logger/logger';

export class CommentService {
    async createComment(
        postId: string,
        authorId: string,
        input: CreateCommentInput
    ) {

        const post = await postRepository.findById(postId);
        if (!post) {
            throw new NotFoundError('Post');
        }


        if (input.parentId) {
            const parent = await commentRepository.findById(input.parentId);
            if (!parent) {
                throw new NotFoundError('Parent comment');
            }
        }

        const commentData: Prisma.CommentCreateInput = {
            content: input.content,
            post: { connect: { id: postId } },
            author: { connect: { id: authorId } },
            ...(input.parentId ? { parent: { connect: { id: input.parentId } } } : {}),
        };

        const comment = await commentRepository.create(commentData);
        logger.info({ commentId: comment.id, postId }, 'Comment created');
        return comment;
    }

    async getComments(postId: string) {
        const post = await postRepository.findById(postId);
        if (!post) {
            throw new NotFoundError('Post');
        }
        return commentRepository.findByPostId(postId);
    }

    async updateComment(commentId: string, requestingUserId: string, requestingUserRole: string, input: UpdateCommentInput) {
        const comment = await commentRepository.findById(commentId);
        if (!comment) throw new NotFoundError('Comment');

        const isAuthor = comment.authorId === requestingUserId;
        const isPrivileged = requestingUserRole === 'ADMIN' || requestingUserRole === 'OWNER';
        if (!isAuthor && !isPrivileged) {
            throw new ForbiddenError('Only the author or an admin can update this comment');
        }

        const updated = await commentRepository.update(commentId, { content: input.content });
        logger.info({ commentId }, 'Comment updated');
        return updated;
    }

    async deleteComment(commentId: string, requestingUserId: string, requestingUserRole: string) {
        const comment = await commentRepository.findById(commentId);
        if (!comment) throw new NotFoundError('Comment');

        const isAuthor = comment.authorId === requestingUserId;
        const isPrivileged = requestingUserRole === 'ADMIN' || requestingUserRole === 'OWNER';
        if (!isAuthor && !isPrivileged) {
            throw new ForbiddenError('Only the author or an admin can delete this comment');
        }

        await commentRepository.softDelete(commentId);
        logger.info({ commentId }, 'Comment deleted');
    }
}

export const commentService = new CommentService();