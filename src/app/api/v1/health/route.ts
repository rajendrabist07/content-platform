import { Router, type Request, type Response } from 'express';
import { prisma } from '../../../../lib/prisma';
import { logger } from '../../../../core/logger/logger';

const router = Router();

export function handleLivenessCheck(req: Request, res: Response) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

export async function handleReadinessCheck(req: Request, res: Response) {
  const startTime = Date.now();
  const log = req.log || logger;

  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        responseTimeMs: dbResponseTime,
      },
    });
  } catch (err) {
    log.error({ err }, 'Readiness check failed — database unreachable');

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
      },
    });
  }
}

router.get('/', handleLivenessCheck);
router.get('/ready', handleReadinessCheck);

export default router;