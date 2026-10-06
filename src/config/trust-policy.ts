import type { TrustLevel } from '@prisma/client';
import { ValidationError } from '../core/errors/HttpError';

export interface TrustPolicyRules {
  maxLinksPerPost: number;
  maxPostsPerDay: number;
  canAutoPublish: boolean;
}

export const TRUST_POLICY: Record<TrustLevel, TrustPolicyRules> = {
  NEW: {
    maxLinksPerPost: 5,
    maxPostsPerDay: 5,
    canAutoPublish: true,
  },
  MEMBER: {
    maxLinksPerPost: 25,
    maxPostsPerDay: 20,
    canAutoPublish: true,
  },
  TRUSTED: {
    maxLinksPerPost: 50,
    maxPostsPerDay: 50,
    canAutoPublish: true,
  },
};

export const AUTO_PROMOTION_RULES = {
  NEW_TO_MEMBER: {
    minApprovedPosts: 2,
    minAccountAgeDays: 3,
  },
};

/**
 * Extracts and validates all markdown links in the content.
 * Links must use http:// or https:// schemes.
 * Throws ValidationError if any invalid URI schemes are used or if link count exceeds trust level cap.
 */
export function validateContentLinks(content: string, trustLevel: TrustLevel = 'NEW'): void {
  const policy = TRUST_POLICY[trustLevel] || TRUST_POLICY.NEW;

  // Regex matches standard Markdown links [text](url) and [text](url "title")
  const linkRegex = /\[(?:[^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  const urls: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(content)) !== null) {
    if (match[1]) {
      urls.push(match[1].trim());
    }
  }

  for (const url of urls) {
    // Check if protocol is safe (only http and https allowed)
    // Disallow javascript:, data:, vbscript:, file:, etc.
    const isHttp = /^https?:\/\//i.test(url);
    if (!isHttp) {
      throw new ValidationError(`Invalid link URL "${url}". Only HTTP and HTTPS URLs are permitted.`);
    }
  }

  if (urls.length > policy.maxLinksPerPost) {
    throw new ValidationError(
      `Content exceeds maximum permitted links for trust level ${trustLevel} (allowed: ${policy.maxLinksPerPost}, found: ${urls.length})`
    );
  }
}
