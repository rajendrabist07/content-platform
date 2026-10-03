import { z } from 'zod';

export const suggestContentSchema = z.object({
  content: z
    .string()
    .min(20, { message: 'Content must be at least 20 characters' }),
});

export type SuggestContentInput = z.infer<typeof suggestContentSchema>;
