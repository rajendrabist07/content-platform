import { describe, it, expect } from 'vitest';
import { isQuoteGrounded, validateGroundedQuotes } from '../../src/modules/comprehension/grounding.validator';

describe('Grounding Validator Unit Tests', () => {
  const sampleArticle = `
    PostgreSQL provides row-level locks and explicit table-level locks.
    In distributed systems, advisory locks offer application-defined mutex primitives.
    However, long-running transactions holding advisory locks can lead to connection pool starvation.
    Therefore, developers must release locks promptly in finally blocks.
  `;

  describe('isQuoteGrounded', () => {
    it('should return true for exact verbatim quotes', () => {
      const quote = 'advisory locks offer application-defined mutex primitives';
      expect(isQuoteGrounded(quote, sampleArticle)).toBe(true);
    });

    it('should return true for case-insensitive and punctuation-varied matches', () => {
      const quote = 'PostgreSQL provides row-level locks, and explicit table-level locks.';
      expect(isQuoteGrounded(quote, sampleArticle)).toBe(true);
    });

    it('should return false for fabricated quotes not in the article', () => {
      const quote = 'Redis is always superior to Postgres advisory locks';
      expect(isQuoteGrounded(quote, sampleArticle)).toBe(false);
    });

    it('should return false for empty or whitespace-only quotes', () => {
      expect(isQuoteGrounded('', sampleArticle)).toBe(false);
      expect(isQuoteGrounded('   ', sampleArticle)).toBe(false);
    });
  });

  describe('validateGroundedQuotes', () => {
    it('should correctly partition valid quotes and hallucinations', () => {
      const quotes = [
        'advisory locks offer application-defined mutex primitives',
        'connection pool starvation',
        'Kafka handles messaging across microservices',
      ];

      const result = validateGroundedQuotes(quotes, sampleArticle);
      expect(result.groundedQuotes).toHaveLength(2);
      expect(result.ungroundedQuotes).toHaveLength(1);
      expect(result.ungroundedQuotes[0]).toBe('Kafka handles messaging across microservices');
      expect(result.isGrounded).toBe(false);
    });

    it('should return isGrounded: true when all quotes exist in article', () => {
      const quotes = [
        'PostgreSQL provides row-level locks',
        'release locks promptly in finally blocks',
      ];

      const result = validateGroundedQuotes(quotes, sampleArticle);
      expect(result.isGrounded).toBe(true);
      expect(result.groundedQuotes).toHaveLength(2);
      expect(result.ungroundedQuotes).toHaveLength(0);
    });
  });
});
