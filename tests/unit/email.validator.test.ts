import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dns from 'dns';
import { validateEmailDeliverability } from '../../src/modules/auth/email.validator';
import { ValidationError } from '../../src/core/errors/HttpError';

describe('Email Validator - Unit Tests', () => {
  describe('Email Syntax Validation', () => {
    it('should pass for valid email formats', async () => {
      await expect(validateEmailDeliverability('author@example.com')).resolves.toBeUndefined();
      await expect(validateEmailDeliverability('jane.doe+test@domain.test')).resolves.toBeUndefined();
    });

    it('should reject invalid email formats', async () => {
      await expect(validateEmailDeliverability('')).rejects.toThrow(ValidationError);
      await expect(validateEmailDeliverability('notanemail')).rejects.toThrow(
        'Please provide a valid and active email address.'
      );
      await expect(validateEmailDeliverability('user@')).rejects.toThrow(
        'Please provide a valid and active email address.'
      );
      await expect(validateEmailDeliverability('@domain.com')).rejects.toThrow(
        'Please provide a valid and active email address.'
      );
    });
  });

  describe('Disposable Domain Blocking', () => {
    it('should reject known disposable and throwaway email providers', async () => {
      const disposableEmails = [
        'attacker@mailinator.com',
        'bot@tempmail.com',
        'spam@10minutemail.com',
        'test@guerrillamail.com',
        'junk@trashmail.com',
        'user@yopmail.com',
      ];

      for (const email of disposableEmails) {
        await expect(validateEmailDeliverability(email)).rejects.toThrow(
          'Please provide a valid and active email address.'
        );
      }
    });
  });

  describe('DNS MX Record Verification', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should accept domain when MX records are found', async () => {
      vi.spyOn(dns.promises, 'resolveMx').mockResolvedValueOnce([
        { exchange: 'mx.realdomain.org', priority: 10 },
      ]);

      await expect(validateEmailDeliverability('user@realdomain.org')).resolves.toBeUndefined();
    });

    it('should reject domain when MX records are empty', async () => {
      vi.spyOn(dns.promises, 'resolveMx').mockResolvedValueOnce([]);

      await expect(validateEmailDeliverability('user@realdomain.org')).rejects.toThrow(
        'Please provide a valid and active email address.'
      );
    });

    it('should reject domain when DNS lookup throws (e.g. NXDOMAIN)', async () => {
      vi.spyOn(dns.promises, 'resolveMx').mockRejectedValueOnce(
        new Error('queryMx ENOTFOUND non-existent-domain-xyz.org')
      );

      await expect(
        validateEmailDeliverability('user@non-existent-domain-xyz.org')
      ).rejects.toThrow('Please provide a valid and active email address.');
    });
  });
});
