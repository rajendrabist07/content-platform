import { describe, it, expect } from 'vitest';
import { envSchema } from '../../src/config/env.schema';

describe('Environment Schema - Unit Tests', () => {
  const validBaseEnv = {
    NODE_ENV: 'test',
    PORT: '3000',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test_db',
    JWT_SECRET: 'a-super-secret-key-that-is-at-least-32-characters-long',
    GEMINI_API_KEY: 'test-gemini-key',
  };

  it('should successfully parse valid environment variables with defaults', () => {
    const result = envSchema.safeParse(validBaseEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('test');
      expect(result.data.PORT).toBe(3000);
      expect(result.data.JWT_EXPIRES_IN).toBe('15m');
      expect(result.data.JWT_REFRESH_EXPIRES_IN).toBe('30d');
      expect(result.data.GEMINI_MODEL).toBe('gemini-2.5-flash');
      expect(result.data.EMAIL_PROVIDER).toBe('console');
      expect(result.data.EMAIL_FROM_ADDRESS).toBe('noreply@contentplatform.com');
      expect(result.data.REQUIRE_VERIFIED_EMAIL).toBe(false);
      expect(result.data.ALLOWED_ORIGINS).toEqual(['http://localhost:3000']);
    }
  });

  it('should reject missing DATABASE_URL', () => {
    const { DATABASE_URL, ...rest } = validBaseEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('DATABASE_URL'));
      expect(issue).toBeDefined();
    }
  });

  it('should reject short JWT_SECRET (< 32 characters)', () => {
    const result = envSchema.safeParse({
      ...validBaseEnv,
      JWT_SECRET: 'too-short-secret',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('JWT_SECRET'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('at least 32 characters');
    }
  });

  it('should reject missing GEMINI_API_KEY', () => {
    const { GEMINI_API_KEY, ...rest } = validBaseEnv;
    const result = envSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('GEMINI_API_KEY'));
      expect(issue).toBeDefined();
    }
  });

  it('should parse comma-separated ALLOWED_ORIGINS correctly', () => {
    const result = envSchema.safeParse({
      ...validBaseEnv,
      ALLOWED_ORIGINS: 'http://localhost:3000, https://myapp.vercel.app',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ALLOWED_ORIGINS).toEqual(['http://localhost:3000', 'https://myapp.vercel.app']);
    }
  });

  it('should reject invalid ALLOWED_ORIGINS with trailing slash or path', () => {
    const result = envSchema.safeParse({
      ...validBaseEnv,
      ALLOWED_ORIGINS: 'https://myapp.vercel.app/api',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('ALLOWED_ORIGINS'));
      expect(issue).toBeDefined();
    }
  });
});
