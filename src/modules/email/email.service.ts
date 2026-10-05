import { env } from '../../config/env';
import { logger } from '../../core/logger/logger';
import {
  type EmailTransport,
  type SendEmailOptions,
  createEmailTransport,
} from './email.transport';
import { renderEmailVerificationTemplate } from './templates/verification.template';
import { renderPasswordResetTemplate } from './templates/passwordReset.template';
import { renderNotificationTemplate } from './templates/notification.template';

export class EmailService {
  private transport: EmailTransport;

  constructor(transport?: EmailTransport) {
    this.transport = transport || createEmailTransport();
  }

  setTransport(transport: EmailTransport) {
    this.transport = transport;
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const maxRetries = 2;
    let delayMs = 300;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.transport.send(options);
        logger.info(
          { to: options.to, subject: options.subject, attempt },
          'Email sent successfully'
        );
        return;
      } catch (err) {
        const isLastAttempt = attempt === maxRetries;
        logger.warn(
          {
            err: err instanceof Error ? err.message : String(err),
            to: options.to,
            subject: options.subject,
            attempt,
            isLastAttempt,
          },
          'Failed to send email'
        );

        if (isLastAttempt) {
          logger.error(
            { to: options.to, subject: options.subject },
            'Exhausted all email sending retries'
          );
          // In non-critical flows we don't throw to avoid failing user actions, but we log critically
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const { html, text, subject } = renderEmailVerificationTemplate({
      name,
      verificationUrl,
    });

    await this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const { html, text, subject } = renderPasswordResetTemplate({
      name,
      resetUrl,
    });

    await this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  async sendNotificationEmail(
    to: string,
    name: string,
    title: string,
    body: string,
    actionUrl?: string
  ): Promise<void> {
    const { html, text, subject } = renderNotificationTemplate({
      name,
      title,
      body,
      actionUrl,
    });

    await this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
