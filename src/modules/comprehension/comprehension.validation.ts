import { z } from 'zod';

export const generateQuizSchema = z.object({
  questionCount: z.number().int().min(2).max(5).optional().default(3),
});

export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;

export const attemptQuizSchema = z.object({
  answers: z
    .array(z.number().int().min(0).max(10), {
      message: 'Answers must be an array of selected option indices',
    })
    .min(1, { message: 'At least one answer must be provided' }),
});

export type AttemptQuizInput = z.infer<typeof attemptQuizSchema>;

export const askArticleSchema = z.object({
  question: z
    .string()
    .min(3, { message: 'Question must be at least 3 characters' })
    .max(500, { message: 'Question must not exceed 500 characters' }),
});

export type AskArticleInput = z.infer<typeof askArticleSchema>;
