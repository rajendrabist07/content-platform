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

interface MigrationRow {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}

export async function handleReadinessCheck(req: Request, res: Response) {
  const startTime = Date.now();
  const log = req.log || logger;

  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;

    const failedMigrations = await prisma.$queryRaw<MigrationRow[]>`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations
      WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL
      LIMIT 1
    `;

    if (failedMigrations.length > 0 && failedMigrations[0]) {
      const failed = failedMigrations[0];
      log.error({ failedMigration: failed }, 'Readiness check failed — migration is pending, failed, or rolled back');
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          status: 'migration_failed',
          responseTimeMs: dbResponseTime,
          failedMigration: failed.migration_name,
        },
      });
    }

    const latestMigrationRows = await prisma.$queryRaw<MigrationRow[]>`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `;

    const latestMigration = latestMigrationRows[0]?.migration_name ?? 'none';

    return res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        responseTimeMs: dbResponseTime,
        latestMigration,
      },
    });
  } catch (err) {
    log.error({ err }, 'Readiness check failed — database or migration table unreachable');

    return res.status(503).json({
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