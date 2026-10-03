import { escapeHtml } from './escapeHtml';

export interface VerificationTemplateProps {
  name: string;
  verificationUrl: string;
}

export function renderEmailVerificationTemplate({ name, verificationUrl }: VerificationTemplateProps): {
  html: string;
  text: string;
  subject: string;
} {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(verificationUrl);

  const subject = 'Verify your email address';
  const text = `Hello ${name},\n\nPlease verify your email address by opening the following link:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9fafb; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { margin-top: 24px; font-size: 13px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify your email</h2>
    <p>Hello ${safeName},</p>
    <p>Thank you for signing up for Content Platform. Please confirm your email address by clicking the button below:</p>
    <p><a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">Verify Email</a></p>
    <p>Or paste this link into your browser:<br><a href="${safeUrl}">${safeUrl}</a></p>
    <p class="footer">This verification link will expire in 24 hours. If you did not create an account, you can safely ignore this email.</p>
  </div>
</body>
</html>`;

  return { html, text, subject };
}
