import type { Post, Tag } from '@prisma/client';
import type { PostResponseDTO } from './post.dto';

type PostWithRelations = Post & {
  tags?: { tag: Tag }[];
  author?: { name: string };
  _count?: { likes: number };
};

export function toPostDTO(post: PostWithRelations): PostResponseDTO {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    status: post.status,
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    authorName: post.author?.name ?? 'Unknown',
    authorId: post.authorId,
    likeCount: post._count?.likes ?? 0,
    createdAt: post.createdAt.toISOString(),
    ...(post.tags ? { tags: post.tags.map((t) => ({ id: t.tag.id, name: t.tag.name })) } : {}),
  };
}