import type { Tag } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export class TagRepository {
    async findByName(name: string): Promise<Tag | null> {
        return prisma.tag.findUnique({ where: { name } });
    }

    async findMany(): Promise<Tag[]> {
        return prisma.tag.findMany({ orderBy: { name: 'asc' } });
    }

    async create(name: string): Promise<Tag> {
        return prisma.tag.create({ data: { name } });
    }

    async findByIds(ids: string[]): Promise<Tag[]> {
        return prisma.tag.findMany({ where: { id: { in: ids } } });
    }

    async attachToPost(postId: string, tagIds: string[]): Promise<void> {

        await prisma.tagsOnPosts.createMany({
            data: tagIds.map((tagId) => ({ postId, tagId })),
            skipDuplicates: true,
        });
    }

    async detachFromPost(postId: string, tagId: string): Promise<void> {
        await prisma.tagsOnPosts.deleteMany({ where: { postId, tagId } });
    }

    async findTagsForPost(postId: string): Promise<Tag[]> {
        const result = await prisma.tagsOnPosts.findMany({
            where: { postId },
            include: { tag: true },
        });
        return result.map((r) => r.tag);
    }
}

export const tagRepository = new TagRepository();