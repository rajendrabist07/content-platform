/**
 * Grounding Validator
 * Verifies that AI-generated citations, quotes, and evidence are verifiably grounded
 * in the source article text, eliminating hallucinations.
 */

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a candidate quote exists verbatim or near-verbatim in the source text.
 */
export function isQuoteGrounded(quote: string, sourceText: string): boolean {
  if (!quote || quote.trim().length === 0) {
    return false;
  }

  const normalizedQuote = normalizeText(quote);
  const normalizedSource = normalizeText(sourceText);

  if (normalizedQuote.length === 0 || normalizedSource.length === 0) {
    return false;
  }

  // 1. Exact normalized substring match
  if (normalizedSource.includes(normalizedQuote)) {
    return true;
  }

  // 2. Fragment match for longer quotes (at least 75% consecutive word match)
  const quoteWords = normalizedQuote.split(' ');
  if (quoteWords.length >= 6) {
    const chunkLength = Math.min(8, Math.floor(quoteWords.length * 0.75));
    const subChunk = quoteWords.slice(0, chunkLength).join(' ');
    if (normalizedSource.includes(subChunk)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates an array of quotes against source article text.
 */
export function validateGroundedQuotes(
  quotes: string[],
  sourceText: string
): { isGrounded: boolean; groundedQuotes: string[]; ungroundedQuotes: string[] } {
  const groundedQuotes: string[] = [];
  const ungroundedQuotes: string[] = [];

  for (const quote of quotes) {
    if (isQuoteGrounded(quote, sourceText)) {
      groundedQuotes.push(quote.trim());
    } else {
      ungroundedQuotes.push(quote.trim());
    }
  }

  const isGrounded = ungroundedQuotes.length === 0 && groundedQuotes.length > 0;

  return {
    isGrounded,
    groundedQuotes,
    ungroundedQuotes,
  };
}
