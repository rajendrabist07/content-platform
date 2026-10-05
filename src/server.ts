import { createApp } from './app';
import { env } from './config/env';
import { logger } from './core/logger/logger';
import { prisma } from './lib/prisma';
import { startJobWorker, stopJobWorker } from './modules/jobs/job.worker';
import type { Server } from 'http';

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
  if (env.NODE_ENV !== 'test') {
    startJobWorker(5000);
  }
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Graceful shutdown signal received, closing connections...');
  stopJobWorker();

  // Force shutdown timer in case connections don't drain
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out (10s), forcing termination');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error closing HTTP server');
      process.exit(1);
    }
    logger.info('HTTP server closed');

    try {
      await prisma.$disconnect();
      logger.info('Database connection closed cleanly');
      process.exit(0);
    } catch (dbErr) {
      logger.error({ err: dbErr }, 'Error disconnecting database');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));