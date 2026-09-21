import { z } from 'zod';

export const createTagSchema = z.object({
    name: z.string().min(1, { message: 'Tag name cannot be empty' }).max(50).toLowerCase(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

export const attachTagsSchema = z.object({
    tagIds: z.array(z.string()).min(1, { message: 'At least one tagId is required' }),
});

export type AttachTagsInput = z.infer<typeof attachTagsSchema>;