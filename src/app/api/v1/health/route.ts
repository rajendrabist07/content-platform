import { Router } from 'express';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../core/logger/logger';

const router = Router();

router.get('/', async (req, res) => {
    const startTime = Date.now();

    try {

        await prisma.$queryRaw`SELECT 1`;

        const dbResponseTime = Date.now() - startTime;

        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                status: 'connected',
                responseTimeMs: dbResponseTime,
            },
        });
    } catch (err) {
        logger.error({ err }, 'Health check failed — database unreachable');

        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: {
                status: 'disconnected',
            },
        });
    }
});

export default router;