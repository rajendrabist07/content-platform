import type { Comment } from '@prisma/client';
import type { CommentResponseDTO } from './comment.dto';

type CommentWithRepliesAndAuthor = Comment & {
    author?: { name: string };
    replies?: CommentWithRepliesAndAuthor[];
};

export function toCommentDTO(comment: CommentWithRepliesAndAuthor): CommentResponseDTO {
    return {
        id: comment.id,
        content: comment.content,
        postId: comment.postId,
        authorName: comment.author?.name ?? 'Unknown',
        authorId: comment.authorId,
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        ...(comment.replies ? { replies: comment.replies.map(toCommentDTO) } : {}),
    };
}