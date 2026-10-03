import { escapeHtml } from './escapeHtml';

export interface PasswordResetTemplateProps {
  name: string;
  resetUrl: string;
}

export function renderPasswordResetTemplate({ name, resetUrl }: PasswordResetTemplateProps): {
  html: string;
  text: string;
  subject: string;
} {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);

  const subject = 'Reset your password';
  const text = `Hello ${name},\n\nWe received a request to reset your password. You can reset it using the following link:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9fafb; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .btn { display: inline-block; background-color: #dc2626; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { margin-top: 24px; font-size: 13px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reset Your Password</h2>
    <p>Hello ${safeName},</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>
    <p><a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a></p>
    <p>Or paste this link into your browser:<br><a href="${safeUrl}">${safeUrl}</a></p>
    <p class="footer">This link will expire in 1 hour. If you did not request this, no action is needed.</p>
  </div>
</body>
</html>`;

  return { html, text, subject };
}
