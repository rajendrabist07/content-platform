import type { Comment, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class CommentRepository {
    async findById(id: string): Promise<Comment | null> {
        return prisma.comment.findFirst({ where: { id, deletedAt: null } });
    }

    async findByPostId(postId: string): Promise<Comment[]> {
        return prisma.comment.findMany({
            where: { postId, deletedAt: null, parentId: null },
            include: {
                replies: { where: { deletedAt: null } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(data: Prisma.CommentCreateInput): Promise<Comment> {
        return prisma.comment.create({ data });
    }

    async update(id: string, data: Prisma.CommentUpdateInput): Promise<Comment> {
        return prisma.comment.update({ where: { id }, data });
    }

    async softDelete(id: string): Promise<Comment> {
        return prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } });
    }
}

export const commentRepository = new CommentRepository();