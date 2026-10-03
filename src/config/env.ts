import 'dotenv/config';
import { envSchema } from './env.schema';

export { envSchema };
export type { Env } from './env.schema';

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.issues);
  process.exit(1);
}

export const env = parsed.data;