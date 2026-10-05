import express from 'express';
import helmet from 'helmet';
import cors, { type CorsOptions } from 'cors';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { errorMiddleware } from './middleware/errorMiddleware';
import { requestIdMiddleware } from './middleware/requestId';
import { accessLoggerMiddleware } from './middleware/accessLogger';
import { generalLimiter } from './middleware/rateLimiter';
import { openApiDocument } from './docs/openapi';
import { ForbiddenError } from './core/errors/HttpError';
import { logger } from './core/logger/logger';
import postRoutes from './app/api/v1/posts/route';
import authRoutes from './app/api/v1/auth/route';
import commentRoutes from './app/api/v1/comments/route';
import tagRoutes from './app/api/v1/tags/route';
import healthRoutes, { handleReadinessCheck } from './app/api/v1/health/route';
import aiRoutes from './app/api/v1/ai/route';
import notificationRoutes from './app/api/v1/notifications/route';
import publicRoutes from './app/api/v1/public/route';
import userRoutes from './app/api/v1/users/route';
import bookmarkRoutes from './app/api/v1/bookmarks/route';
import reportRoutes from './app/api/v1/reports/route';
import adminRoutes from './app/api/v1/admin/route';
import { auditRouter } from './app/api/v1/audit/route';

export function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>(env.ALLOWED_ORIGINS);

  if (env.APP_URL) {
    try {
      origins.add(new URL(env.APP_URL).origin);
    } catch {
      // ignore invalid URL in test mocks
    }
  }

  if (env.NEXT_PUBLIC_SITE_URL) {
    try {
      origins.add(new URL(env.NEXT_PUBLIC_SITE_URL).origin);
    } catch {
      // ignore invalid URL in test mocks
    }
  }

  return origins;
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);
  app.use(accessLoggerMiddleware);

  app.use(helmet());

  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      // Allow non-browser requests (e.g. curl, server-to-server, health check probes)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      const allowedOrigins = getAllowedOrigins();

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      logger.warn({ origin: normalizedOrigin }, 'CORS request rejected: origin not allowed');
      return callback(new ForbiddenError(`Origin '${origin}' not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Correlation-Id',
      'X-Refresh-Token',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-Id', 'X-Correlation-Id'],
    maxAge: 86400,
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1/health', healthRoutes);
  app.get('/api/v1/ready', handleReadinessCheck);

  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/api/v1/docs.json', (req, res) => {
    res.json(openApiDocument);
  });

  app.use(generalLimiter);

  app.use('/api/v1/posts', postRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/posts/:postId/comments', commentRoutes);
  app.use('/api/v1/tags', tagRoutes);
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/public', publicRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/bookmarks', bookmarkRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1', auditRouter);

  app.use(errorMiddleware);

  return app;
}