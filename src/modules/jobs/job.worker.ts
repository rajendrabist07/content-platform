import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { getJobHandler } from './job.queue';
import { logger } from '../../core/logger/logger';

const WORKER_ID = `worker-${crypto.randomBytes(4).toString('hex')}`;
let pollTimer: NodeJS.Timeout | null = null;
let isProcessing = false;

export async function processNextJob(workerId: string = WORKER_ID): Promise<boolean> {
  const now = new Date();

  // 1. Transactionally lock the next pending job with SKIP LOCKED
  const lockedJobs = await prisma.$queryRaw<Array<{ id: string; name: string; payload: unknown; attempts: number; maxAttempts: number }>>`
    SELECT id, name, payload, attempts, "maxAttempts"
    FROM background_jobs
    WHERE status = 'PENDING' AND "runAt" <= ${now}
    ORDER BY "runAt" ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
  `;

  const job = lockedJobs[0];
  if (!job) {
    return false;
  }

  // Update status to PROCESSING
  const currentAttempts = job.attempts + 1;
  await prisma.backgroundJob.update({
    where: { id: job.id },
    data: {
      status: 'PROCESSING',
      lockedAt: now,
      lockedBy: workerId,
      attempts: currentAttempts,
    },
  });

  const handler = getJobHandler(job.name);
  if (!handler) {
    const errorMsg = `No registered handler found for job "${job.name}"`;
    logger.error({ jobId: job.id, name: job.name }, errorMsg);

    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        lastError: errorMsg,
        lockedAt: null,
        lockedBy: null,
      },
    });

    return true;
  }

  try {
    logger.info({ jobId: job.id, name: job.name, workerId }, 'Processing background job');
    await handler(job.payload);

    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        lockedAt: null,
        lockedBy: null,
      },
    });

    logger.info({ jobId: job.id, name: job.name }, 'Job completed successfully');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ jobId: job.id, name: job.name, err }, 'Job execution failed');

    if (currentAttempts >= job.maxAttempts) {
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          lastError: errorMessage,
          lockedAt: null,
          lockedBy: null,
        },
      });
      logger.warn({ jobId: job.id, attempts: currentAttempts }, 'Job reached maximum retry attempts, marked as FAILED');
    } else {
      // Exponential backoff: 2^attempts * 5 seconds
      const backoffSeconds = Math.pow(2, currentAttempts) * 5;
      const nextRunAt = new Date(Date.now() + backoffSeconds * 1000);

      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          runAt: nextRunAt,
          lastError: errorMessage,
          lockedAt: null,
          lockedBy: null,
        },
      });
      logger.info({ jobId: job.id, nextRunAt, backoffSeconds }, 'Job scheduled for retry');
    }
  }

  return true;
}

export function startJobWorker(intervalMs: number = 3000): void {
  if (pollTimer) {
    return;
  }

  logger.info({ workerId: WORKER_ID, intervalMs }, 'Starting background job worker');

  pollTimer = setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      let processed = true;
      // Drain queue batch
      while (processed) {
        processed = await processNextJob(WORKER_ID);
      }
    } catch (err) {
      logger.error({ err }, 'Error in job worker polling loop');
    } finally {
      isProcessing = false;
    }
  }, intervalMs);
}

export function stopJobWorker(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    logger.info({ workerId: WORKER_ID }, 'Background job worker stopped');
  }
}
