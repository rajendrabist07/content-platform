// src/modules/posts/post.repository.ts (पूरा implementation)
import { Post, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface IPostRepository {
  findById(id: string): Promise<Post | null>;
  findBySlug(organizationId: string, slug: string): Promise<Post | null>;
  findMany(organizationId: string): Promise<Post[]>;
  create(data: Prisma.PostCreateInput): Promise<Post>;
  update(id: string, data: Prisma.PostUpdateInput): Promise<Post>;
  softDelete(id: string): Promise<Post>;
}

export class PostRepository implements IPostRepository {
  async findById(id: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: {
        id,
        deletedAt: null, 
      },
    });
  }

  async findBySlug(organizationId: string, slug: string): Promise<Post | null> {
    return prisma.post.findFirst({
      where: { organizationId, slug, deletedAt: null },
    });
  }

  async findMany(organizationId: string): Promise<Post[]> {
    return prisma.post.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc', 
      },
    });
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