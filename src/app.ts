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
import postRoutes from './app/api/v1/posts/route';
import authRoutes from './app/api/v1/auth/route';
import commentRoutes from './app/api/v1/comments/route';
import tagRoutes from './app/api/v1/tags/route';
import healthRoutes, { handleReadinessCheck } from './app/api/v1/health/route';
import aiRoutes from './app/api/v1/ai/route';

const corsOptions: CorsOptions = {
    origin(origin, callback) {
        if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
};

export function createApp() {
    const app = express();

    app.set('trust proxy', 1);

    app.use(requestIdMiddleware);
    app.use(accessLoggerMiddleware);

    app.use(helmet());
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

    app.use(errorMiddleware);

    return app;
}