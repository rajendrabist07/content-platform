import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Health & Production Foundations - Integration', () => {
  describe('GET /api/v1/health', () => {
    it('should return 200 with liveness status', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/v1/ready', () => {
    it('should return 200 with database connectivity status and latest migration', async () => {
      const res = await request(app).get('/api/v1/ready');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ready');
      expect(res.body.database).toHaveProperty('status', 'connected');
      expect(res.body.database).toHaveProperty('responseTimeMs');
      expect(res.body.database).toHaveProperty('latestMigration');
      expect(typeof res.body.database.latestMigration).toBe('string');
    });
  });

  describe('X-Request-Id Middleware', () => {
    it('should generate and return X-Request-Id header when none provided', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.headers['x-request-id']).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect((res.headers['x-request-id'] as string).length).toBeGreaterThan(0);
    });

    it('should preserve and echo client-provided X-Request-Id header', async () => {
      const customReqId = 'custom-request-id-12345';
      const res = await request(app)
        .get('/api/v1/health')
        .set('x-request-id', customReqId);

      expect(res.headers['x-request-id']).toBe(customReqId);
    });
  });

  describe('Body Size Limit', () => {
    it('should reject request payload larger than 100kb', async () => {
      const oversizedPayload = { data: 'a'.repeat(110 * 1024) };

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(oversizedPayload);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
