import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { errorMiddleware } from './middleware/errorMiddleware';
import { generalLimiter } from './middleware/rateLimiter';
import postRoutes from './app/api/v1/posts/route';
import authRoutes from './app/api/v1/auth/route';
import commentRoutes from './app/api/v1/comments/route';
import tagRoutes from './app/api/v1/tags/route';
import healthRoutes from './app/api/v1/health/route';


export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors({
        origin: env.NODE_ENV === 'production'
            ? 'https://yourdomain.com'
            : '*',
    }));
    app.use(express.json());

    app.use('/api/v1/health', healthRoutes);

    app.use(generalLimiter);

    app.use('/api/v1/posts', postRoutes);
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/posts/:postId/comments', commentRoutes);
    app.use('/api/v1/tags', tagRoutes);


    app.use(errorMiddleware);

    return app;
}