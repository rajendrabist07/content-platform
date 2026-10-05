import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('CORS & Correlation ID Hardening - Integration', () => {
  describe('CORS Origin Validation', () => {
    it('should allow requests from configured allowed origin with CORS headers', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle OPTIONS preflight from allowed origin', async () => {
      const res = await request(app)
        .options('/api/v1/posts')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization, X-Request-Id');

      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should reject requests from unauthorized origin with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://malicious-site.evil.com');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(403);
      expect(res.body.message).toContain("Origin 'http://malicious-site.evil.com' not allowed by CORS policy");
    });

    it('should allow server-to-server and non-browser requests without Origin header', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('Correlation & Request ID Propagation', () => {
    it('should generate both X-Request-Id and X-Correlation-Id when none provided', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      const reqId = res.headers['x-request-id'];
      const corrId = res.headers['x-correlation-id'];

      expect(reqId).toBeDefined();
      expect(corrId).toBeDefined();
      expect(reqId).toBe(corrId);
    });

    it('should adopt and propagate incoming X-Request-Id', async () => {
      const customId = 'req-trace-id-abc-123';
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Request-Id', customId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customId);
      expect(res.headers['x-correlation-id']).toBe(customId);
    });

    it('should adopt and propagate incoming X-Correlation-Id', async () => {
      const customCorrId = 'corr-trace-id-xyz-789';
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Correlation-Id', customCorrId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customCorrId);
      expect(res.headers['x-correlation-id']).toBe(customCorrId);
    });
  });
});
