import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from '../../src/modules/email/email.service';
import {
  ConsoleEmailTransport,
  BrevoEmailTransport,
  type EmailTransport,
} from '../../src/modules/email/email.transport';
import { escapeHtml } from '../../src/modules/email/templates/escapeHtml';
import { renderEmailVerificationTemplate } from '../../src/modules/email/templates/verification.template';
import { renderPasswordResetTemplate } from '../../src/modules/email/templates/passwordReset.template';
import { renderNotificationTemplate } from '../../src/modules/email/templates/notification.template';

describe('Email Infrastructure - Unit Tests', () => {
  describe('HTML Escaping & Templates', () => {
    it('should properly escape HTML special characters', () => {
      const input = '<script>alert("XSS & \'attack\'")</script>';
      const escaped = escapeHtml(input);

      expect(escaped).toBe(
        '&lt;script&gt;alert(&quot;XSS &amp; &#039;attack&#039;&quot;)&lt;/script&gt;'
      );
      expect(escaped).not.toContain('<script>');
    });

    it('should sanitize dynamic inputs in verification template', () => {
      const result = renderEmailVerificationTemplate({
        name: 'Jane <script>alert(1)</script>',
        verificationUrl: 'http://localhost:3000/auth/verify-email?token=xyz&foo=bar',
      });

      expect(result.html).toContain('Jane &lt;script&gt;alert(1)&lt;/script&gt;');
      expect(result.html).toContain('&amp;foo=bar');
      expect(result.html).not.toContain('<script>alert(1)</script>');
      expect(result.text).toContain('http://localhost:3000/auth/verify-email?token=xyz&foo=bar');
    });

    it('should sanitize dynamic inputs in password reset template', () => {
      const result = renderPasswordResetTemplate({
        name: 'Bob "The Hacker"',
        resetUrl: 'http://localhost:3000/auth/reset-password?token=secret123',
      });

      expect(result.html).toContain('Bob &quot;The Hacker&quot;');
      expect(result.text).toContain('http://localhost:3000/auth/reset-password?token=secret123');
    });

    it('should render notification template with optional action URL', () => {
      const result = renderNotificationTemplate({
        name: 'Alice',
        title: 'New Comment on your post <b>Cool</b>',
        body: 'User X said: "Great article!"',
        actionUrl: 'http://localhost:3000/posts/cool-post',
      });

      expect(result.html).toContain('&lt;b&gt;Cool&lt;/b&gt;');
      expect(result.html).toContain('User X said: &quot;Great article!&quot;');
      expect(result.html).toContain('href="http://localhost:3000/posts/cool-post"');
      expect(result.text).toContain('View details: http://localhost:3000/posts/cool-post');
    });
  });

  describe('ConsoleEmailTransport', () => {
    it('should execute send without throwing', async () => {
      const transport = new ConsoleEmailTransport();
      await expect(
        transport.send({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Hello</p>',
          text: 'Hello',
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('BrevoEmailTransport', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should send HTTP POST request to Brevo API with valid payload and headers', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ messageId: 'msg-123' }),
      } as unknown as Response);

      const transport = new BrevoEmailTransport('test-brevo-api-key');

      await transport.send({
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<p>Welcome</p>',
        text: 'Welcome',
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const call = vi.mocked(global.fetch).mock.calls[0];
      expect(call).toBeDefined();
      const [url, options] = call!;

      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      expect(options?.method).toBe('POST');
      expect((options?.headers as Record<string, string>)['api-key']).toBe('test-brevo-api-key');

      const body = JSON.parse(options?.body as string);
      expect(body.to).toEqual([{ email: 'user@example.com' }]);
      expect(body.subject).toBe('Welcome');
      expect(body.htmlContent).toBe('<p>Welcome</p>');
    });

    it('should throw an error when Brevo API responds with non-2xx status', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Key not found',
      } as unknown as Response);

      const transport = new BrevoEmailTransport('invalid-key');

      await expect(
        transport.send({
          to: 'user@example.com',
          subject: 'Welcome',
          html: '<p>Welcome</p>',
          text: 'Welcome',
        })
      ).rejects.toThrow('Brevo HTTP API returned status 401: Key not found');
    });
  });

  describe('EmailService Retry Logic', () => {
    it('should succeed on first attempt if transport succeeds', async () => {
      const mockTransport: EmailTransport = {
        send: vi.fn().mockResolvedValue(undefined),
      };

      const emailService = new EmailService(mockTransport);
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(mockTransport.send).toHaveBeenCalledTimes(1);
    });

    it('should retry and succeed when transport fails transiently', async () => {
      const mockTransport: EmailTransport = {
        send: vi
          .fn()
          .mockRejectedValueOnce(new Error('Network timeout'))
          .mockResolvedValueOnce(undefined),
      };

      const emailService = new EmailService(mockTransport);
      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(mockTransport.send).toHaveBeenCalledTimes(2);
    });

    it('should handle exhausted retries gracefully without throwing unhandled rejection', async () => {
      const mockTransport: EmailTransport = {
        send: vi.fn().mockRejectedValue(new Error('Persistent server error')),
      };

      const emailService = new EmailService(mockTransport);
      await expect(
        emailService.sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        })
      ).resolves.toBeUndefined();

      expect(mockTransport.send).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });
  });
});
