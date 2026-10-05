/**
 * Canonical Tag Normalizer for Chronicle
 *
 * Rules:
 * - Lowercase and trim
 * - Strip leading/trailing punctuation except valid language identifiers (e.g. c++, c#, node.js)
 * - Collapse whitespace into single hyphens
 * - Allow characters matching: ^[a-z0-9][a-z0-9+#._-]{0,29}$
 * - Maximum length: 30 characters
 * - Reject sentence fragments (more than 3 words, lingering spaces, trailing sentence punctuation, or stop-word noise)
 */

const STOP_WORD_FRAGMENTS = new Set([
  'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'it', 'this', 'that', 'from', 'as'
]);

export function normalizeTag(rawTag: string): string | null {
  if (!rawTag || typeof rawTag !== 'string') {
    return null;
  }

  // 1. Lowercase and trim
  let tag = rawTag.toLowerCase().trim();

  // 2. Strip common leading symbols (#, @, !, ?, ,, ;, :)
  tag = tag.replace(/^[#@!?,;:]+/, '');

  // 3. Strip trailing punctuation (. , ! ? ; : )
  tag = tag.replace(/[!?,;:.]+$/, '');

  // 4. Collapse whitespace into hyphens
  tag = tag.replace(/\s+/g, '-');

  // 5. Collapse consecutive hyphens
  tag = tag.replace(/-+/g, '-');

  // 6. Strip leading/trailing hyphens or underscores
  tag = tag.replace(/^[-_]+|[-_]+$/g, '');

  if (!tag) {
    return null;
  }

  // 7. Check length (1 to 30 chars)
  if (tag.length < 1 || tag.length > 30) {
    return null;
  }

  // 8. Validate against allowed characters
  // Must start with alphanumeric, followed by alphanumeric or +, #, ., _, -
  const validTagRegex = /^[a-z0-9][a-z0-9+#._-]{0,29}$/;
  if (!validTagRegex.test(tag)) {
    return null;
  }

  // 9. Reject sentence fragments (e.g. "and-backend", "this-is-a-post", "read-more")
  const parts = tag.split('-');
  if (parts.length > 3) {
    // More than 3 hyphenated words indicates a sentence fragment rather than a technical tag
    return null;
  }

  if (parts.length === 2 && (STOP_WORD_FRAGMENTS.has(parts[0]!) || STOP_WORD_FRAGMENTS.has(parts[1]!))) {
    // Reject fragments starting with conjunctions like "and-backend"
    if (STOP_WORD_FRAGMENTS.has(parts[0]!)) {
      // If it's something like "and-backend", return the valid substantive part if valid
      const substantive = parts[1]!;
      if (validTagRegex.test(substantive) && substantive.length >= 2 && !STOP_WORD_FRAGMENTS.has(substantive)) {
        return substantive;
      }
      return null;
    }
  }

  return tag;
}

export function normalizeTags(rawTags: string[], maxTags = 5): string[] {
  if (!Array.isArray(rawTags)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawTags) {
    const normalized = normalizeTag(raw);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
      if (result.length >= maxTags) {
        break;
      }
    }
  }

  return result;
}
