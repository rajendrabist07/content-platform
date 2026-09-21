import type { Post, Tag } from '@prisma/client';
import type { PostResponseDTO } from './post.dto';

type PostWithTags = Post & { tags?: { tag: Tag }[] };

export function toPostDTO(post: PostWithTags): PostResponseDTO {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    status: post.status,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    authorId: post.authorId,
    createdAt: post.createdAt.toISOString(),
    ...(post.tags ? { tags: post.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })) } : {}),
  };
}