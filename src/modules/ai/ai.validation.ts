import { z } from 'zod';
import { normalizeTags } from '../tags/tag.normalizer';

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
    .min(1, { message: 'At least 1 tag required' })
    .transform((tags) => normalizeTags(tags, 5))
    .refine((tags) => tags.length >= 2, {
      message: 'At least 2 valid unique tags required after normalization',
    }),
  summary: z.string().trim().min(5, { message: 'Summary must be at least 5 characters' }),
});

export type AiSuggestionOutput = z.infer<typeof aiSuggestionOutputSchema>;

export const improveContentSchema = z.object({
  content: z
    .string()
    .min(20, { message: 'Content must be at least 20 characters' })
    .max(MAX_AI_INPUT_LENGTH, { message: `Content must not exceed ${MAX_AI_INPUT_LENGTH} characters` }),
  tone: z
    .enum(['technical', 'casual', 'professional', 'concise'])
    .default('professional'),
});

export type ImproveContentInput = z.infer<typeof improveContentSchema>;

export const aiImproveOutputSchema = z.object({
  improvedContent: z.string().min(10, { message: 'Improved content cannot be empty' }),
  changes: z.array(z.string()).min(1, { message: 'At least one change explanation required' }),
  readingTimeMinutes: z.number().int().positive().default(1),
});

export type AiImproveOutput = z.infer<typeof aiImproveOutputSchema>;

export const outlineContentSchema = z.object({
  topic: z
    .string()
    .min(5, { message: 'Topic must be at least 5 characters' })
    .max(200, { message: 'Topic must not exceed 200 characters' }),
  targetAudience: z.string().max(100).optional(),
  sectionsCount: z.coerce.number().int().min(2).max(10).default(4),
});

export type OutlineContentInput = z.infer<typeof outlineContentSchema>;

export const aiOutlineOutputSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters' }),
  targetAudience: z.string().default('General audience'),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1, { message: 'Heading cannot be empty' }),
        keyPoints: z.array(z.string()).min(1, { message: 'Key points required' }),
      })
    )
    .min(2, { message: 'At least 2 sections required' }),
});

export type AiOutlineOutput = z.infer<typeof aiOutlineOutputSchema>;
