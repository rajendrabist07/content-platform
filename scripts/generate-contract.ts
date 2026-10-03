import fs from 'fs';
import path from 'path';
import { openApiDocument } from '../src/docs/openapi';

function generateMarkdownContract(): string {
  let md = `# Content Platform API — Contract & Frontend Integration Guide\n\n`;
  md += `> Generated automatically from OpenAPI 3.1 definitions (\`src/docs/openapi.ts\`).\n\n`;

  md += `## Standard Response Envelopes\n\n`;
  md += `All endpoints return the consistent JSON envelope:\n\n`;
  md += `\`\`\`json\n{\n  "success": true,\n  "data": { ... },\n  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 },\n  "message": "Optional human-readable message",\n  "statusCode": 200\n}\n\`\`\`\n\n`;
  md += `Error responses always format as:\n\n`;
  md += `\`\`\`json\n{\n  "success": false,\n  "message": "Descriptive error message",\n  "statusCode": 400\n}\n\`\`\`\n\n`;

  md += `## Frontend-Relevant Behaviors & Key Semantics\n\n`;
  md += `1. **Email Verification Gating**:\n`;
  md += `   - When \`REQUIRE_VERIFIED_EMAIL=true\`, unverified users attempting mutating actions receive HTTP \`403 Forbidden\` with message: \`"Email verification required. Please verify your email to perform this action."\`\n`;
  md += `   - Verification flow: \`POST /api/v1/auth/verify-email?token=...\` or body \`{ "token": "..." }\`.\n\n`;

  md += `2. **Engagement Operations (Likes & Bookmarks)**:\n`;
  md += `   - **Likes**:\n`;
  md += `     - \`POST /api/v1/posts/:id/like\` — Toggles like/unlike (idempotent state returned: \`{ "liked": boolean, "likeCount": number }\`).\n`;
  md += `     - \`DELETE /api/v1/posts/:id/like\` — Explicit unlike.\n`;
  md += `   - **Bookmarks**:\n`;
  md += `     - \`POST /api/v1/posts/:id/bookmark\` — Toggles bookmark state (returns \`{ "bookmarked": boolean }\`).\n`;
  md += `     - \`DELETE /api/v1/posts/:id/bookmark\` — Explicit unbookmark.\n`;
  md += `     - \`GET /api/v1/bookmarks\` — Returns paginated bookmarked posts for current user.\n\n`;

  md += `3. **User Profile vs Auth Identity**:\n`;
  md += `   - \`GET /api/v1/auth/me\` — Returns core authenticated user identity (\`id\`, \`email\`, \`name\`, \`role\`, \`organizationId\`, \`emailVerified\`).\n`;
  md += `   - \`GET /api/v1/users/me\` — Returns profile view including \`bio\`, \`avatarUrl\`, and \`emailNotifications\` preference.\n`;
  md += `   - \`PATCH /api/v1/users/me\` — Updates \`name\`, \`bio\`, \`avatarUrl\`, and \`emailNotifications\`.\n\n`;

  md += `4. **Public & SEO Endpoints**:\n`;
  md += `   - \`GET /api/v1/public/posts\` — Public post list with \`tag\`, \`page\`, \`limit\` filters and \`Cache-Control\`.\n`;
  md += `   - \`GET /api/v1/public/posts/:slug\` — Post by unique slug.\n`;
  md += `   - \`GET /api/v1/public/tags\` — All public tags with published post counts.\n`;
  md += `   - \`GET /api/v1/public/sitemap\` — Dynamic XML/JSON sitemap.\n`;
  md += `   - *Note*: \`/public/posts/:slug/comments\` is not a standalone route; comments are accessed via authenticated \`/api/v1/posts/:postId/comments\`.\n\n`;

  md += `5. **In-App Notifications**:\n`;
  md += `   - \`GET /api/v1/notifications\` — Returns array of notification items with \`id\`, \`type\` (\`NEW_COMMENT\`, \`NEW_REPLY\`, \`POST_PUBLISHED\`, \`SYSTEM\`), \`title\`, \`body\`, \`readAt\`, and \`data\` JSON.\n`;
  md += `   - \`GET /api/v1/notifications/unread-count\` — Returns \`{ "unreadCount": number }\`.\n`;
  md += `   - \`PATCH /api/v1/notifications/:id/read\` — Marks single item as read.\n`;
  md += `   - \`POST /api/v1/notifications/read-all\` — Marks all unread items as read.\n\n`;

  md += `6. **Pagination Meta Shape**:\n`;
  md += `   - Present on all list endpoints: \`{ "page": number, "limit": number, "total": number, "totalPages": number }\` (capped at 50 max).\n\n`;

  md += `7. **AI Endpoints (Google Gemini)**:\n`;
  md += `   - \`POST /api/v1/ai/suggest\` — Generates suggested \`title\`, \`tags\`, and \`summary\`.\n`;
  md += `   - \`POST /api/v1/ai/improve\` — Generates \`improvedContent\`, \`critique\`, \`changes\` array, \`readabilityScore\`, and \`readingTimeMinutes\`.\n`;
  md += `   - \`POST /api/v1/ai/outline\` — Generates structured outline with \`title\`, \`targetAudience\`, \`sections\` array, and \`estimatedTotalWords\`.\n\n`;

  md += `8. **Audit Logging**:\n`;
  md += `   - \`GET /api/v1/audit-logs\` — Scoped to organization; accessible only to \`OWNER\` and \`ADMIN\` roles.\n\n`;

  md += `## Complete API Endpoint Table\n\n`;
  md += `| Method | Path | Summary | Auth | Request Body / Query | Success Response |\n`;
  md += `| :--- | :--- | :--- | :---: | :--- | :--- |\n`;

  const paths = openApiDocument.paths as Record<string, Record<string, any>>;

  for (const [routePath, methods] of Object.entries(paths)) {
    for (const [method, spec] of Object.entries(methods)) {
      const isAuth = spec.security && spec.security.length > 0;
      const summary = spec.summary || '';
      const authStr = isAuth ? '🔒 Bearer' : '🌐 Public';
      const params = (spec.parameters || []).map((p: any) => `${p.name} (${p.in})`).join(', ') || 'None';
      md += `| \`${method.toUpperCase()}\` | \`/api/v1${routePath}\` | ${summary} | ${authStr} | ${params} | 200/201 Envelope |\n`;
    }
  }

  md += `\n---\n`;
  return md;
}

const docsDir = path.resolve('docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const outputPath = path.join(docsDir, 'API_CONTRACT.md');
fs.writeFileSync(outputPath, generateMarkdownContract(), 'utf-8');
console.log(`✅ API contract exported to ${outputPath}`);
