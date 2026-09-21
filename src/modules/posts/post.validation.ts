import { z } from 'zod';

export const createPostSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Title must be at least 3 characters' })
    .max(200, { message: 'Title must not exceed 200 characters' }),

  content: z
    .string()
    .min(10, { message: 'Content must be at least 10 characters' }),

  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),

  tagIds: z.array(z.string()).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = z.object({
  title: z
    .string()
    .min(3, { message: 'Title must be at least 3 characters' })
    .max(200, { message: 'Title must not exceed 200 characters' })
    .optional(),

  content: z
    .string()
    .min(10, { message: 'Content must be at least 10 characters' })
    .optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;