import { z } from 'zod';

export const createReportSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT', 'USER'], {
    message: 'targetType must be POST, COMMENT, or USER',
  }),
  targetId: z
    .string()
    .min(1, { message: 'targetId is required' })
    .max(100, { message: 'targetId must not exceed 100 characters' }),
  reason: z.enum(['SPAM', 'HARASSMENT', 'MISINFORMATION', 'ILLEGAL', 'OTHER'], {
    message: 'reason must be SPAM, HARASSMENT, MISINFORMATION, ILLEGAL, or OTHER',
  }),
  details: z
    .string()
    .max(1000, { message: 'details must not exceed 1000 characters' })
    .optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const updateReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED'], {
    message: 'status must be RESOLVED or DISMISSED',
  }),
  resolutionNote: z
    .string()
    .max(1000, { message: 'resolutionNote must not exceed 1000 characters' })
    .optional(),
});

export type UpdateReportInput = z.infer<typeof updateReportSchema>;
