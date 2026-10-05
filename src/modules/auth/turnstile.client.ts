import { env } from '../../config/env';
import { logger } from '../../core/logger/logger';
import { ValidationError } from '../../core/errors/HttpError';

interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

export async function verifyTurnstileToken(token?: string, remoteIp?: string): Promise<void> {
  // If Turnstile is disabled (local/testing), pass verification automatically
  if (!env.TURNSTILE_ENABLED) {
    return;
  }

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw new ValidationError('Captcha verification token is required');
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    logger.error('Turnstile is enabled but TURNSTILE_SECRET_KEY is not configured');
    throw new ValidationError('Captcha verification service is improperly configured');
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const formData = new URLSearchParams();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.error({ status: response.status }, 'Turnstile verification HTTP error');
      throw new ValidationError('Captcha verification failed. Please try again.');
    }

    const result = (await response.json()) as TurnstileVerifyResponse;

    if (!result.success) {
      logger.warn({ errorCodes: result['error-codes'] }, 'Turnstile captcha validation failed');
      throw new ValidationError('Captcha verification failed. Please complete the challenge.');
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    logger.error({ err }, 'Exception during Turnstile verification');
    // Fail-closed in production if Turnstile is enabled
    throw new ValidationError('Captcha verification service is temporarily unavailable. Please retry.');
  }
}
