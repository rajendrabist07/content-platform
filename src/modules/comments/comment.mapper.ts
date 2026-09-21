import type { Comment } from '@prisma/client';
import type { CommentResponseDTO } from './comment.dto';


type CommentWithReplies = Comment & { replies?: Comment[] };

export function toCommentDTO(comment: CommentWithReplies): CommentResponseDTO {
    return {
        id: comment.id,
        content: comment.content,
        postId: comment.postId,
        authorId: comment.authorId,
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        ...(comment.replies ? { replies: comment.replies.map(toCommentDTO) } : {}),
    };
}