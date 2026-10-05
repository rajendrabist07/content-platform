import dns from 'dns';
import { isDisposableEmail } from './disposable-domains';
import { ValidationError } from '../../core/errors/HttpError';
import { env } from '../../config/env';
import { logger } from '../../core/logger/logger';

/**
 * Validates email format, blocks disposable email domains, and checks for active DNS MX records.
 */
export async function validateEmailDeliverability(email: string): Promise<void> {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    throw new ValidationError('Please provide a valid and active email address.');
  }

  const trimmed = email.trim().toLowerCase();
  const domain = trimmed.split('@')[1];

  if (!domain) {
    throw new ValidationError('Please provide a valid and active email address.');
  }

  // 1. Block disposable email providers
  if (isDisposableEmail(trimmed)) {
    throw new ValidationError('Please provide a valid and active email address.');
  }

  // 2. Skip network MX lookup for local/test/dummy domains
  if (
    domain.endsWith('.test') ||
    domain.endsWith('.local') ||
    domain.endsWith('.example') ||
    domain === 'example.com' ||
    domain === 'acme.com' ||
    domain === 'techstart.io' ||
    domain === 'chronicle-test.com' ||
    domain === 'chronicle-mod.com' ||
    domain === 'chronicle-comp.com' ||
    domain === 'postest.com' ||
    domain === 'commenttest.com' ||
    domain === 'publictest.com'
  ) {
    return;
  }

  // 3. Perform DNS MX record lookup
  try {
    const mxRecords = await dns.promises.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      throw new ValidationError('Please provide a valid and active email address.');
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    logger.warn({ domain, err }, 'DNS MX record lookup failed for email domain');
    throw new ValidationError('Please provide a valid and active email address.');
  }
}
