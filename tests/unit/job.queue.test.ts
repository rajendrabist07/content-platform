import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { enqueueJob, registerJobHandler } from '../../src/modules/jobs/job.queue';
import { processNextJob } from '../../src/modules/jobs/job.worker';

describe('Durable Background Job Queue Unit Tests', () => {
  beforeEach(async () => {
    await prisma.backgroundJob.deleteMany({});
  });

  afterAll(async () => {
    await prisma.backgroundJob.deleteMany({});
    await prisma.$disconnect();
  });

  it('should enqueue and successfully process a background job', async () => {
    const handlerMock = vi.fn().mockResolvedValue(undefined);
    registerJobHandler('test:email_digest', handlerMock);

    const jobId = await enqueueJob('test:email_digest', { userId: 'u123', count: 5 });
    expect(jobId).toBeDefined();

    const processed = await processNextJob('test-worker-1');
    expect(processed).toBe(true);
    expect(handlerMock).toHaveBeenCalledWith({ userId: 'u123', count: 5 });

    const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
    expect(job?.status).toBe('COMPLETED');
    expect(job?.attempts).toBe(1);
  });

  it('should retry a failed job with exponential backoff', async () => {
    const failingMock = vi.fn().mockRejectedValue(new Error('Network timeout during dispatch'));
    registerJobHandler('test:failing_job', failingMock);

    const jobId = await enqueueJob('test:failing_job', { item: 'data' }, { maxAttempts: 3 });

    // First attempt
    await processNextJob('test-worker-1');

    const jobAfterFail1 = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
    expect(jobAfterFail1?.status).toBe('PENDING');
    expect(jobAfterFail1?.attempts).toBe(1);
    expect(jobAfterFail1?.lastError).toContain('Network timeout');
    expect(jobAfterFail1?.runAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should mark job as FAILED when maxAttempts is reached', async () => {
    const failingMock = vi.fn().mockRejectedValue(new Error('Persistent API Error'));
    registerJobHandler('test:max_fail_job', failingMock);

    const jobId = await enqueueJob('test:max_fail_job', { test: true }, { maxAttempts: 1 });

    await processNextJob('test-worker-1');

    const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
    expect(job?.status).toBe('FAILED');
    expect(job?.attempts).toBe(1);
    expect(job?.lastError).toContain('Persistent API Error');
  });
});
