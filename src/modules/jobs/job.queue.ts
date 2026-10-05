import { prisma } from '../../lib/prisma';
import type { JobHandler, EnqueueOptions } from './job.types';
import { logger } from '../../core/logger/logger';

const handlers = new Map<string, JobHandler<any>>();

export function registerJobHandler<T = unknown>(name: string, handler: JobHandler<T>): void {
  handlers.set(name, handler as JobHandler<any>);
  logger.info({ jobName: name }, 'Registered background job handler');
}

export function getJobHandler(name: string): JobHandler<any> | undefined {
  return handlers.get(name);
}

export async function enqueueJob<T = unknown>(
  name: string,
  payload: T,
  options?: EnqueueOptions
): Promise<string> {
  const job = await prisma.backgroundJob.create({
    data: {
      name,
      payload: payload as any,
      runAt: options?.runAt ?? new Date(),
      maxAttempts: options?.maxAttempts ?? 3,
      status: 'PENDING',
    },
  });

  logger.info({ jobId: job.id, name, runAt: job.runAt }, 'Job enqueued successfully');
  return job.id;
}
