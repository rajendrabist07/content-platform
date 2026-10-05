import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection string' }),
  PORT: z.coerce.number().int().positive().default(3000),

  JWT_SECRET: z.string().min(32, {
    message: 'JWT_SECRET must be at least 32 characters for security',
  }),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  GEMINI_API_KEY: z.string().min(1, { message: 'GEMINI_API_KEY is required' }),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

  EMAIL_PROVIDER: z.enum(['brevo', 'console']).default('console'),
  BREVO_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().default('noreply@contentplatform.com'),
  EMAIL_FROM_NAME: z.string().default('Content Platform'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  REQUIRE_VERIFIED_EMAIL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  TURNSTILE_SECRET_KEY: z.string().optional(),
  TURNSTILE_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((raw) => raw.split(',').map((o) => o.trim()).filter(Boolean))
    .refine(
      (list) =>
        list.every((o) => {
          try {
            return new URL(o).origin === o;
          } catch {
            return false;
          }
        }),
      { message: 'ALLOWED_ORIGINS must be comma-separated origins, e.g. https://app.vercel.app (no trailing slash, no path)' },
    ),
});

export type Env = z.infer<typeof envSchema>;
