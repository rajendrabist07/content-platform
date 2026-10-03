import type { Comment, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';

const authorInclude = {
    author: { select: { name: true } },
} as const;

export class CommentRepository {
    async findById(id: string): Promise<Comment | null> {
        return prisma.comment.findFirst({
            where: { id, deletedAt: null },
            include: authorInclude,
        });
    }

    async findByPostId(postId: string): Promise<Comment[]> {
        return prisma.comment.findMany({
            where: { postId, deletedAt: null, parentId: null },
            include: {
                ...authorInclude,
                replies: {
                    where: { deletedAt: null },
                    include: authorInclude,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(data: Prisma.CommentCreateInput): Promise<Comment> {
        return prisma.comment.create({
            data,
            include: authorInclude,
        });
    }

    async update(id: string, data: Prisma.CommentUpdateInput): Promise<Comment> {
        return prisma.comment.update({
            where: { id },
            data,
            include: authorInclude,
        });
    }

    async softDelete(id: string): Promise<Comment> {
        return prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } });
    }
}

export const commentRepository = new CommentRepository();