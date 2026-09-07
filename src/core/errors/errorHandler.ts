import { AppError } from './AppError';
import { logger } from '../logger/logger';

interface ErrorResponse {
  success: false;
  message: string;
  statusCode: number;
}

export function handleError(err: unknown): ErrorResponse {
  if (err instanceof AppError) {
    logger.warn({ err: err.message, statusCode: err.statusCode }, 'Operational error occurred');
    return {
      success: false,
      message: err.message,
      statusCode: err.statusCode,
    };
  }

  logger.error({ err }, 'Unexpected error occurred');

  return {
    success: false,
    message: 'Something went wrong. Please try again later.',
    statusCode: 500,
  };
}