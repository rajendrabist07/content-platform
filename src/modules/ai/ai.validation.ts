import { z } from 'zod';

export const MAX_AI_INPUT_LENGTH = 10000;

export const suggestContentSchema = z.object({
  content: z
    .string()
    .min(20, { message: 'Content must be at least 20 characters' })
    .max(MAX_AI_INPUT_LENGTH, { message: `Content must not exceed ${MAX_AI_INPUT_LENGTH} characters` }),
});

export type SuggestContentInput = z.infer<typeof suggestContentSchema>;

export const aiSuggestionOutputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: 'Title cannot be empty' })
    .max(70, { message: 'Title must not exceed 70 characters' }),
  tags: z
    .array(z.string())
    .min(3, { message: 'At least 3 tags required' })
    .max(5, { message: 'At most 5 tags allowed' })
    .transform((tags) => {
      const normalized = tags
        .map((t) => t.toLowerCase().trim())
        .filter((t) => t.length > 0);
      return Array.from(new Set(normalized));
    })
    .refine((tags) => tags.length >= 3, {
      message: 'At least 3 unique tags required',
    }),
  summary: z.string().trim().min(5, { message: 'Summary must be at least 5 characters' }),
});

export type AiSuggestionOutput = z.infer<typeof aiSuggestionOutputSchema>;
