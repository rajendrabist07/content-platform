# Content Platform API — Contract & Frontend Integration Guide

> Generated automatically from OpenAPI 3.1 definitions (`src/docs/openapi.ts`).

## Standard Response Envelopes

All endpoints return the consistent JSON envelope:

```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 },
  "message": "Optional human-readable message",
  "statusCode": 200
}
```

Error responses always format as:

```json
{
  "success": false,
  "message": "Descriptive error message",
  "statusCode": 400
}
```

## Frontend-Relevant Behaviors & Key Semantics

1. **Email Verification Gating**:
   - When `REQUIRE_VERIFIED_EMAIL=true`, unverified users attempting mutating actions receive HTTP `403 Forbidden` with message: `"Email verification required. Please verify your email to perform this action."`
   - Verification flow: `POST /api/v1/auth/verify-email?token=...` or body `{ "token": "..." }`.

2. **Engagement Operations (Likes & Bookmarks)**:
   - **Likes**:
     - `POST /api/v1/posts/:id/like` — Toggles like/unlike (idempotent state returned: `{ "liked": boolean, "likeCount": number }`).
     - `DELETE /api/v1/posts/:id/like` — Explicit unlike.
   - **Bookmarks**:
     - `POST /api/v1/posts/:id/bookmark` — Toggles bookmark state (returns `{ "bookmarked": boolean }`).
     - `DELETE /api/v1/posts/:id/bookmark` — Explicit unbookmark.
     - `GET /api/v1/bookmarks` — Returns paginated bookmarked posts for current user.

3. **User Profile vs Auth Identity**:
   - `GET /api/v1/auth/me` — Returns core authenticated user identity (`id`, `email`, `name`, `role`, `organizationId`, `emailVerified`).
   - `GET /api/v1/users/me` — Returns profile view including `bio`, `avatarUrl`, and `emailNotifications` preference.
   - `PATCH /api/v1/users/me` — Updates `name`, `bio`, `avatarUrl`, and `emailNotifications`.

4. **Public & SEO Endpoints**:
   - `GET /api/v1/public/posts` — Public post list with `tag`, `page`, `limit` filters and `Cache-Control`.
   - `GET /api/v1/public/posts/:slug` — Post by unique slug.
   - `GET /api/v1/public/tags` — All public tags with published post counts.
   - `GET /api/v1/public/sitemap` — Dynamic XML/JSON sitemap.
   - *Note*: `/public/posts/:slug/comments` is not a standalone route; comments are accessed via authenticated `/api/v1/posts/:postId/comments`.

5. **In-App Notifications**:
   - `GET /api/v1/notifications` — Returns array of notification items with `id`, `type` (`NEW_COMMENT`, `NEW_REPLY`, `POST_PUBLISHED`, `SYSTEM`), `title`, `body`, `readAt`, and `data` JSON.
   - `GET /api/v1/notifications/unread-count` — Returns `{ "unreadCount": number }`.
   - `PATCH /api/v1/notifications/:id/read` — Marks single item as read.
   - `POST /api/v1/notifications/read-all` — Marks all unread items as read.

6. **Pagination Meta Shape**:
   - Present on all list endpoints: `{ "page": number, "limit": number, "total": number, "totalPages": number }` (capped at 50 max).

7. **AI Endpoints (Google Gemini)**:
   - `POST /api/v1/ai/suggest` — Generates suggested `title`, `tags`, and `summary`.
   - `POST /api/v1/ai/improve` — Generates `improvedContent`, `critique`, `changes` array, `readabilityScore`, and `readingTimeMinutes`.
   - `POST /api/v1/ai/outline` — Generates structured outline with `title`, `targetAudience`, `sections` array, and `estimatedTotalWords`.

8. **Audit Logging**:
   - `GET /api/v1/audit-logs` — Scoped to organization; accessible only to `OWNER` and `ADMIN` roles.

## Complete API Endpoint Table

| Method | Path | Summary | Auth | Request Body / Query | Success Response |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/health` | Liveness probe | 🌐 Public | None | 200/201 Envelope |
| `GET` | `/api/v1/ready` | Readiness probe | 🌐 Public | None | 200/201 Envelope |
| `GET` | `/api/v1/public/posts` | List published posts publicly (SEO / Unauthenticated) | 🌐 Public | page (query), limit (query), tag (query), search (query), authorId (query), organizationId (query) | 200/201 Envelope |
| `GET` | `/api/v1/public/posts/{slug}` | Get published post by slug | 🌐 Public | slug (path) | 200/201 Envelope |
| `GET` | `/api/v1/public/tags` | List all tags with published post counts | 🌐 Public | None | 200/201 Envelope |
| `GET` | `/api/v1/public/sitemap` | SEO Sitemap index of published posts | 🌐 Public | None | 200/201 Envelope |
| `GET` | `/api/v1/users/me` | Get current user profile and preferences | 🔒 Bearer | None | 200/201 Envelope |
| `PATCH` | `/api/v1/users/me` | Update current user profile and notification preferences | 🔒 Bearer | None | 200/201 Envelope |
| `GET` | `/api/v1/bookmarks` | List bookmarked posts for authenticated user | 🔒 Bearer | page (query), limit (query) | 200/201 Envelope |
| `POST` | `/api/v1/auth/register` | Register a new user | 🌐 Public | None | 200/201 Envelope |
| `POST` | `/api/v1/auth/login` | Log in with email and password | 🌐 Public | None | 200/201 Envelope |
| `POST` | `/api/v1/auth/verify-email` | Verify user email address using token | 🌐 Public | None | 200/201 Envelope |
| `POST` | `/api/v1/auth/resend-verification` | Resend email verification link | 🌐 Public | None | 200/201 Envelope |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset email | 🌐 Public | None | 200/201 Envelope |
| `POST` | `/api/v1/auth/reset-password` | Reset password using reset token | 🌐 Public | None | 200/201 Envelope |
| `POST` | `/api/v1/auth/change-password` | Change password for authenticated user | 🔒 Bearer | None | 200/201 Envelope |
| `POST` | `/api/v1/auth/refresh` | Exchange a refresh token for a new access token | 🌐 Public | None | 200/201 Envelope |
| `POST` | `/api/v1/auth/logout` | Revoke a refresh token | 🌐 Public | None | 200/201 Envelope |
| `POST` | `/api/v1/posts` | Create a post | 🔒 Bearer | None | 200/201 Envelope |
| `GET` | `/api/v1/posts` | List posts (paginated) | 🔒 Bearer | page (query), limit (query), status (query) | 200/201 Envelope |
| `GET` | `/api/v1/posts/{id}` | Get a single post by ID | 🔒 Bearer | id (path) | 200/201 Envelope |
| `PATCH` | `/api/v1/posts/{id}` | Update a post (partial) | 🔒 Bearer | id (path) | 200/201 Envelope |
| `DELETE` | `/api/v1/posts/{id}` | Delete a post (soft delete) | 🔒 Bearer | id (path) | 200/201 Envelope |
| `PATCH` | `/api/v1/posts/{id}/publish` | Publish a post | 🔒 Bearer | id (path) | 200/201 Envelope |
| `POST` | `/api/v1/posts/{id}/like` | Like a post | 🔒 Bearer | id (path) | 200/201 Envelope |
| `DELETE` | `/api/v1/posts/{id}/like` | Unlike a post | 🔒 Bearer | id (path) | 200/201 Envelope |
| `POST` | `/api/v1/posts/{id}/bookmark` | Bookmark a post | 🔒 Bearer | id (path) | 200/201 Envelope |
| `DELETE` | `/api/v1/posts/{id}/bookmark` | Remove bookmark from a post | 🔒 Bearer | id (path) | 200/201 Envelope |
| `POST` | `/api/v1/posts/{postId}/comments` | Create a comment (or a threaded reply) | 🔒 Bearer | postId (path) | 200/201 Envelope |
| `GET` | `/api/v1/posts/{postId}/comments` | List comments for a post (threaded) | 🔒 Bearer | postId (path) | 200/201 Envelope |
| `PATCH` | `/api/v1/posts/{postId}/comments/{id}` | Update a comment | 🔒 Bearer | postId (path), id (path) | 200/201 Envelope |
| `DELETE` | `/api/v1/posts/{postId}/comments/{id}` | Delete a comment (soft delete) | 🔒 Bearer | postId (path), id (path) | 200/201 Envelope |
| `POST` | `/api/v1/tags` | Create a tag | 🔒 Bearer | None | 200/201 Envelope |
| `GET` | `/api/v1/tags` | List all tags | 🔒 Bearer | None | 200/201 Envelope |
| `POST` | `/api/v1/posts/{postId}/tags` | Attach one or more tags to a post | 🔒 Bearer | postId (path) | 200/201 Envelope |
| `DELETE` | `/api/v1/posts/{postId}/tags/{tagId}` | Detach a tag from a post | 🔒 Bearer | postId (path), tagId (path) | 200/201 Envelope |
| `GET` | `/api/v1/notifications` | List user notifications with pagination | 🔒 Bearer | page (query), limit (query), unreadOnly (query) | 200/201 Envelope |
| `GET` | `/api/v1/notifications/unread-count` | Get total unread notification count | 🔒 Bearer | None | 200/201 Envelope |
| `PATCH` | `/api/v1/notifications/{id}/read` | Mark single notification as read | 🔒 Bearer | id (path) | 200/201 Envelope |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all notifications as read | 🔒 Bearer | None | 200/201 Envelope |
| `POST` | `/api/v1/ai/suggest` | Generate post suggestions (title, tags, summary) | 🔒 Bearer | None | 200/201 Envelope |
| `POST` | `/api/v1/ai/improve` | Improve and polish blog post prose with tone selection | 🔒 Bearer | None | 200/201 Envelope |
| `POST` | `/api/v1/ai/outline` | Generate structured article outline for topic | 🔒 Bearer | None | 200/201 Envelope |
| `GET` | `/api/v1/audit-logs` | List security and lifecycle audit logs (OWNER or ADMIN only) | 🔒 Bearer | action (query), userId (query), page (query), limit (query) | 200/201 Envelope |

---
