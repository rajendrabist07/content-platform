import { escapeHtml } from './escapeHtml';

export interface LoginAlertTemplateProps {
  name: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  timestamp?: Date | undefined;
}

export function renderLoginAlertTemplate({
  name,
  ipAddress = 'Unknown IP',
  userAgent = 'Unknown Device',
  timestamp = new Date(),
}: LoginAlertTemplateProps): {
  html: string;
  text: string;
  subject: string;
} {
  const safeName = escapeHtml(name);
  const safeIp = escapeHtml(ipAddress);
  const safeAgent = escapeHtml(userAgent);
  const timeStr = timestamp.toUTCString();

  const subject = 'Security Alert: New sign-in to your Chronicle account';
  const text = `Hello ${name},\n\nWe detected a new sign-in to your Chronicle account.\n\nTime: ${timeStr}\nIP Address: ${ipAddress}\nDevice/Client: ${userAgent}\n\nIf this was you, you can safely ignore this email. If you did not sign in, please change your password immediately.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9fafb; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .footer { margin-top: 24px; font-size: 13px; color: #6b7280; }
    .details { background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0; font-family: monospace; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>New Sign-in Detected</h2>
    <p>Hello ${safeName},</p>
    <p>We detected a new sign-in to your Chronicle account:</p>
    <div class="details">
      <p><strong>Time (UTC):</strong> ${timeStr}</p>
      <p><strong>IP Address:</strong> ${safeIp}</p>
      <p><strong>Device:</strong> ${safeAgent}</p>
    </div>
    <p>If this was you, no further action is required.</p>
    <p><strong>If you did not sign in:</strong> Please reset your password immediately and review your active sessions.</p>
    <p class="footer">Chronicle Security Team</p>
  </div>
</body>
</html>`;

  return { html, text, subject };
}
