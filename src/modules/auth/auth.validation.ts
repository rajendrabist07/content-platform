import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email({ message: 'Invalid email format' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    organizationName: z.string().min(2, { message: 'Organization name must be at least 2 characters' }).optional(),
    organizationId: z.string().min(1).optional(),
  })
  .refine((data) => data.organizationName || data.organizationId, {
    message: 'Either organizationName (to create new) or organizationId (to join existing) is required',
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export type LoginInput = z.infer<typeof loginSchema>;