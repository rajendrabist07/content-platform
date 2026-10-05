import { z } from 'zod';
import { normalizeTag } from './tag.normalizer';

export const createTagSchema = z.object({
    name: z
        .string()
        .min(1, { message: 'Tag name cannot be empty' })
        .max(50, { message: 'Tag name cannot exceed 50 characters' })
        .refine((val) => normalizeTag(val) !== null, {
            message: 'Tag name is invalid. Must be alphanumeric (e.g. typescript, node.js, c++, c#) and not a sentence fragment.',
        }),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

export const attachTagsSchema = z.object({
    tagIds: z.array(z.string()).min(1, { message: 'At least one tagId is required' }),
});

export type AttachTagsInput = z.infer<typeof attachTagsSchema>;