import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }).optional(),
  bio: z.string().max(500, { message: 'Bio must not exceed 500 characters' }).optional(),
  avatarUrl: z.string().url({ message: 'avatarUrl must be a valid URL' }).optional().or(z.literal('')),
  emailNotifications: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
