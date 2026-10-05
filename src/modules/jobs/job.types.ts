import type { JobStatus } from '@prisma/client';

export type JobHandler<T = unknown> = (payload: T) => Promise<void>;

export interface EnqueueOptions {
  runAt?: Date;
  maxAttempts?: number;
}

export interface JobRecord<T = unknown> {
  id: string;
  name: string;
  payload: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}
