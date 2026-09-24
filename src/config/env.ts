import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be avalid connection string' }),
  PORT: z.coerce.number().int().positive().default(3000),

  JWT_SECRET: z.string().min(32, {
    message: 'JWT_SECRET must beat least 32 characters for security',
  }),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),


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

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.issues);
  process.exit(1);
}

export const env = parsed.data;