import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection string' }),
  PORT: z.coerce.number().int().positive().default(3000),


  JWT_SECRET: z.string().min(32, {
    message: 'JWT_SECRET must be at least 32 characters for security',
  }),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.issues);
  process.exit(1);
}

export const env = parsed.data;