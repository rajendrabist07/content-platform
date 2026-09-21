import type { Post, Prisma } from '@prisma/client';
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
  findMany(organizationId: string, pagination: PaginationParams): Promise<PaginatedResult<Post>>;
  create(data: Prisma.PostCreateInput): Promise<Post>;
  update(id: string, data: Prisma.PostUpdateInput): Promise<Post>;
  softDelete(id: string): Promise<Post>;
}

export class PostRepository implements IPostRepository {
  async findById(id: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: { tags: { include: { tag: true } } },
    });
  }

  async findBySlug(organizationId: string, slug: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { organizationId, slug, deletedAt: null },
    });
  }

  async findMany(
    organizationId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Post>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;


    const [data, total] = await prisma.$transaction([
      prisma.post.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({
        where: { organizationId, deletedAt: null },
      }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.PostCreateInput): Promise<Post> {
    return prisma.post.create({ data });
  }

  async update(id: string, data: Prisma.PostUpdateInput): Promise<Post> {
    return prisma.post.update({
      where: { id },
      data,
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