import { escapeHtml } from './escapeHtml';

export interface NotificationTemplateProps {
  name: string;
  title: string;
  body: string;
  actionUrl?: string | undefined;
}

export function renderNotificationTemplate({ name, title, body, actionUrl }: NotificationTemplateProps): {
  html: string;
  text: string;
  subject: string;
} {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const safeActionUrl = actionUrl ? escapeHtml(actionUrl) : undefined;

  const subject = title;
  let text = `Hello ${name},\n\n${title}\n\n${body}`;
  if (actionUrl) {
    text += `\n\nView details: ${actionUrl}`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9fafb; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { margin-top: 24px; font-size: 13px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h2>${safeTitle}</h2>
    <p>Hello ${safeName},</p>
    <p>${safeBody}</p>
    ${safeActionUrl ? `<p><a href="${safeActionUrl}" class="btn" target="_blank" rel="noopener noreferrer">View Details</a></p>` : ''}
    <p class="footer">You received this notification from Content Platform.</p>
  </div>
</body>
</html>`;

  return { html, text, subject };
}
