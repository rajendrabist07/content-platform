import { AppError } from './AppError';
import { logger } from '../logger/logger';
import type { Logger } from 'pino';

interface ErrorResponse {
  success: false;
  message: string;
  statusCode: number;
}

export function handleError(err: unknown, log: Logger = logger): ErrorResponse {
  if (err instanceof AppError) {
    log.warn({ err: err.message, statusCode: err.statusCode }, 'Operational error occurred');
    return {
      success: false,
      message: err.message,
      statusCode: err.statusCode,
    };
  }

  log.error({ err }, 'Unexpected error occurred');

  return {
    success: false,
    message: 'Something went wrong. Please try again later.',
    statusCode: 500,
  };
}