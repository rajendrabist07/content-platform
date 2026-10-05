import { z } from 'zod';
import { isDisposableEmail } from './disposable-domains';

export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(72, { message: 'Password must not exceed 72 characters' });

export const registerSchema = z
  .object({
    email: z
      .string()
      .email({ message: 'Invalid email format' })
      .refine((val) => !isDisposableEmail(val), {
        message: 'Please use a valid personal or work email address',
      }),
    password: passwordSchema,
    name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    organizationName: z.string().min(2, { message: 'Organization name must be at least 2 characters' }).optional(),
    organizationId: z.string().min(1).optional(),
    captchaToken: z.string().optional(),
  })
  .refine((data) => data.organizationName || data.organizationId, {
    message: 'Either organizationName (to create new) or organizationId (to join existing) is required',
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' }).max(72),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  captchaToken: z.string().optional(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
  newPassword: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1, { message: 'Verification token is required' }),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;