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

const authorAndTagsInclude = {
  author: { select: { name: true } },
  tags: { include: { tag: true } },
} as const;

export class PostRepository {
  async findById(id: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: authorAndTagsInclude,
    });
  }

  async findBySlug(organizationId: string, slug: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { organizationId, slug, deletedAt: null },
      include: authorAndTagsInclude,
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
        include: authorAndTagsInclude,
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
        include: authorAndTagsInclude,
      }),
      prisma.post.count({ where }),
    ]);

    return { data, total };
  }

  async findPublicBySlug(slug: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: authorAndTagsInclude,
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
      include: authorAndTagsInclude,
    });
  }

  async update(id: string, data: Prisma.PostUpdateInput): Promise<Post> {
    return prisma.post.update({
      where: { id },
      data,
      include: authorAndTagsInclude,
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