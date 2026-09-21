import type { Request, Response, NextFunction } from 'express';
import { tagService } from './tag.service';
import { createTagSchema, attachTagsSchema } from './tag.validation';
import { toTagDTO } from './tag.mapper';
import { ValidationError, UnauthorizedError } from '../../core/errors/HttpError';

export class TagController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new UnauthorizedError('Authentication required');

            const result = createTagSchema.safeParse(req.body);
            if (!result.success) {
                throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
            }

            const tag = await tagService.createTag(result.data.name);
            res.status(201).json({ success: true, data: toTagDTO(tag) });
        } catch (err) {
            next(err);
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new UnauthorizedError('Authentication required');
            const tags = await tagService.listTags();
            res.json({ success: true, data: tags.map(toTagDTO) });
        } catch (err) {
            next(err);
        }
    }

    async attachToPost(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new UnauthorizedError('Authentication required');

            const postId = req.params.postId;
            if (typeof postId !== 'string' || !postId) {
                throw new ValidationError('Post id is required');
            }

            const result = attachTagsSchema.safeParse(req.body);
            if (!result.success) {
                throw new ValidationError(result.error.issues[0]?.message ?? 'Validation failed');
            }

            const tags = await tagService.attachTagsToPost(postId, result.data.tagIds);
            res.status(201).json({ success: true, data: tags.map(toTagDTO) });
        } catch (err) {
            next(err);
        }
    }

    async detachFromPost(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new UnauthorizedError('Authentication required');

            const postId = req.params.postId;
            const tagId = req.params.tagId;
            if (typeof postId !== 'string' || !postId || typeof tagId !== 'string' || !tagId) {
                throw new ValidationError('Post id and tag id are required');
            }

            await tagService.detachTagFromPost(postId, tagId);
            res.status(204).send();
        } catch (err) {
            next(err);
        }
    }
}

export const tagController = new TagController();