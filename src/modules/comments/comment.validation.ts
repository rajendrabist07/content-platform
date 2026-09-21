import { z } from 'zod';

export const createCommentSchema = z.object({
    content: z.string().min(1, { message: 'Comment cannot be empty' }).max(2000),
    parentId: z.string().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
    content: z.string().min(1, { message: 'Comment cannot be empty' }).max(2000),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;