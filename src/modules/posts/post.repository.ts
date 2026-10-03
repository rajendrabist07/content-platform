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

export interface IPostRepository {
  findById(id: string): Promise<Post | null>;
  findBySlug(organizationId: string, slug: string): Promise<Post | null>;
  findMany(
    organizationId: string,
    pagination: PaginationParams,
    status?: PostStatus
  ): Promise<PaginatedResult<Post>>;
  create(data: Prisma.PostCreateInput): Promise<Post>;
  update(id: string, data: Prisma.PostUpdateInput): Promise<Post>;
  softDelete(id: string): Promise<Post>;
}


const authorInclude = {
  author: { select: { name: true } },
} as const;

export class PostRepository implements IPostRepository {
  async findById(id: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
        ...authorInclude,
      },
    });
  }

  async findBySlug(organizationId: string, slug: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { organizationId, slug, deletedAt: null },
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
        include: authorInclude,
      }),
      prisma.post.count({
        where,
      }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.PostCreateInput): Promise<Post> {
    return prisma.post.create({
      data,
      include: authorInclude,
    });
  }

  async update(id: string, data: Prisma.PostUpdateInput): Promise<Post> {
    return prisma.post.update({
      where: { id },
      data,
      include: authorInclude,
    });
  }

  async softDelete(id: string): Promise<Post> {
    return prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const postRepository = new PostRepository();