import { Post } from '@prisma/client';
import { PostResponseDTO } from './post.dto';

export function toPostDTO(post: Post): PostResponseDTO {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    status: post.status,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    authorId: post.authorId,
    createdAt: post.createdAt.toISOString(),

  };
}
