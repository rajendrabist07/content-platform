import { env } from '../../config/env';
import { logger } from '../../core/logger/logger';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromEmail?: string;
  fromName?: string;
}

export interface EmailTransport {
  send(options: SendEmailOptions): Promise<void>;
}

export class ConsoleEmailTransport implements EmailTransport {
  async send(options: SendEmailOptions): Promise<void> {
    const fromEmail = options.fromEmail || env.EMAIL_FROM_ADDRESS;
    const fromName = options.fromName || env.EMAIL_FROM_NAME;

    logger.info(
      {
        to: options.to,
        from: `"${fromName}" <${fromEmail}>`,
        subject: options.subject,
        textPreview: options.text.substring(0, 120),
      },
      '[ConsoleEmailTransport] Simulated email sent'
    );
  }
}

export class BrevoEmailTransport implements EmailTransport {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor(apiKey?: string) {
    const key = apiKey || env.BREVO_API_KEY;
    if (!key) {
      throw new Error('BREVO_API_KEY must be provided for BrevoEmailTransport');
    }
    this.apiKey = key;
  }

  async send(options: SendEmailOptions): Promise<void> {
    const fromEmail = options.fromEmail || env.EMAIL_FROM_ADDRESS;
    const fromName = options.fromName || env.EMAIL_FROM_NAME;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: fromEmail,
          },
          to: [
            {
              email: options.to,
            },
          ],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorBody: string;
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Unknown response body';
        }

        throw new Error(`Brevo HTTP API returned status ${response.status}: ${errorBody}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export function createEmailTransport(): EmailTransport {
  if (env.EMAIL_PROVIDER === 'brevo' && env.BREVO_API_KEY) {
    return new BrevoEmailTransport(env.BREVO_API_KEY);
  }
  return new ConsoleEmailTransport();
}
