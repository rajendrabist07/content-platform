import type { Post, Prisma, PostStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface PublicPostFilters {
  tag?: string | undefined;
  search?: string | undefined;
  authorId?: string | undefined;
  organizationId?: string | undefined;
}

const defaultPostInclude = {
  author: { select: { name: true } },
  tags: { include: { tag: true } },
  _count: { select: { likes: true } },
} as const;

export class PostRepository {
  async findById(id: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: defaultPostInclude,
    });
  }

  async findBySlug(organizationId: string, slug: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { organizationId, slug, deletedAt: null },
      include: defaultPostInclude,
    });
  }

  async findMany(
    organizationId: string,
    pagination: PaginationParams,
    status?: PostStatus
  ): Promise<PaginatedResult<Post>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      organizationId,
      deletedAt: null,
      ...(status ? { status } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: defaultPostInclude,
      }),
      prisma.post.count({
        where,
      }),
    ]);

    return { data, total };
  }

  async findPublicMany(
    filters: PublicPostFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Post>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
      ...(filters.authorId ? { authorId: filters.authorId } : {}),
      ...(filters.tag
        ? {
            tags: {
              some: {
                tag: {
                  name: { equals: filters.tag, mode: 'insensitive' },
                },
              },
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { content: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        include: defaultPostInclude,
      }),
      prisma.post.count({ where }),
    ]);

    return { data, total };
  }

  async findPublicBySlug(slug: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: defaultPostInclude,
    });
  }

  async findPublishedSitemap() {
    return prisma.post.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: {
        slug: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async create(data: Prisma.PostCreateInput): Promise<Post> {
    return prisma.post.create({
      data,
      include: defaultPostInclude,
    });
  }

  async update(id: string, data: Prisma.PostUpdateInput): Promise<Post> {
    return prisma.post.update({
      where: { id },
      data,
      include: defaultPostInclude,
    });
  }

  async softDelete(id: string): Promise<Post> {
    return prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addLike(postId: string, userId: string): Promise<number> {
    await prisma.postLike.upsert({
      where: {
        postId_userId: { postId, userId },
      },
      create: { postId, userId },
      update: {},
    });

    return prisma.postLike.count({ where: { postId } });
  }

  async removeLike(postId: string, userId: string): Promise<number> {
    await prisma.postLike.deleteMany({
      where: { postId, userId },
    });

    return prisma.postLike.count({ where: { postId } });
  }

  async isLiked(postId: string, userId: string): Promise<boolean> {
    const like = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    return like !== null;
  }

  async addBookmark(postId: string, userId: string): Promise<void> {
    await prisma.bookmark.upsert({
      where: {
        postId_userId: { postId, userId },
      },
      create: { postId, userId },
      update: {},
    });
  }

  async removeBookmark(postId: string, userId: string): Promise<void> {
    await prisma.bookmark.deleteMany({
      where: { postId, userId },
    });
  }

  async isBookmarked(postId: string, userId: string): Promise<boolean> {
    const bookmark = await prisma.bookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    return bookmark !== null;
  }

  async findBookmarks(
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Post>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId, post: { deletedAt: null } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            include: defaultPostInclude,
          },
        },
      }),
      prisma.bookmark.count({ where: { userId, post: { deletedAt: null } } }),
    ]);

    return {
      data: bookmarks.map((b) => b.post),
      total,
    };
  }
}

export const postRepository = new PostRepository();