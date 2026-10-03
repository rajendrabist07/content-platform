import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// If .env.test exists locally, load it first for optional local overrides
const envTestPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envTestPath)) {
  config({ path: envTestPath });
}

// Ensure all schema-required environment variables have valid test defaults.
// Pre-existing environment variables (such as CI-provided DATABASE_URL) are preserved.
const testDefaults: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/content_platform_test?schema=public',
  JWT_SECRET: 'test-jwt-secret-key-that-is-at-least-32-characters-long',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '30d',
  GEMINI_API_KEY: 'test-gemini-api-key-not-real',
  GEMINI_MODEL: 'gemini-2.5-flash',
  EMAIL_PROVIDER: 'console',
  EMAIL_FROM_ADDRESS: 'noreply@contentplatform.com',
  EMAIL_FROM_NAME: 'Content Platform',
  APP_URL: 'http://localhost:3000',
  REQUIRE_VERIFIED_EMAIL: 'false',
  ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5173',
};

for (const [key, value] of Object.entries(testDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
