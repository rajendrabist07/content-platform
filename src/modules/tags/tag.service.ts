import { tagRepository } from './tag.repository';
import { postRepository } from '../posts/post.repository';
import { NotFoundError, ConflictError } from '../../core/errors/HttpError';
import { logger } from '../../core/logger/logger';

export class TagService {
    async createTag(name: string) {
        const existing = await tagRepository.findByName(name);
        if (existing) {
            throw new ConflictError(`Tag "${name}" already exists`);
        }
        const tag = await tagRepository.create(name);
        logger.info({ tagId: tag.id, name }, 'Tag created');
        return tag;
    }

    async listTags() {
        return tagRepository.findMany();
    }

    async attachTagsToPost(postId: string, tagIds: string[]) {
        const post = await postRepository.findById(postId);
        if (!post) {
            throw new NotFoundError('Post');
        }

        const foundTags = await tagRepository.findByIds(tagIds);
        if (foundTags.length !== tagIds.length) {
            throw new NotFoundError('One or more tags');
        }

        await tagRepository.attachToPost(postId, tagIds);
        logger.info({ postId, tagIds }, 'Tags attached to post');
        return tagRepository.findTagsForPost(postId);
    }

    async detachTagFromPost(postId: string, tagId: string) {
        const post = await postRepository.findById(postId);
        if (!post) {
            throw new NotFoundError('Post');
        }
        await tagRepository.detachFromPost(postId, tagId);
        logger.info({ postId, tagId }, 'Tag detached from post');
    }
}

export const tagService = new TagService();