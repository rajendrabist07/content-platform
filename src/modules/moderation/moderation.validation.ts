import { z } from 'zod';

export const rejectPostSchema = z.object({
  reason: z
    .string()
    .min(1, { message: 'Rejection reason is required' })
    .max(1000, { message: 'Rejection reason must not exceed 1000 characters' }),
});

export type RejectPostInput = z.infer<typeof rejectPostSchema>;

export const setTrustLevelSchema = z.object({
  trustLevel: z.enum(['NEW', 'MEMBER', 'TRUSTED'], {
    message: 'trustLevel must be NEW, MEMBER, or TRUSTED',
  }),
});

export type SetTrustLevelInput = z.infer<typeof setTrustLevelSchema>;

export const suspendUserSchema = z.object({
  reason: z
    .string()
    .max(500, { message: 'Reason must not exceed 500 characters' })
    .optional(),
});

export type SuspendUserInput = z.infer<typeof suspendUserSchema>;
