# Chronicle API

> **Technical writing you can trust — and learn from.**

Chronicle is a production-grade, multi-tenant engineering publishing platform and REST API built with Node.js, TypeScript, Express, Prisma, and PostgreSQL.

Unlike generic blogging engines, Chronicle combines two foundational pillars:
1. **The Trust Layer**: Sybil and abuse resistance through tiered trust levels (`NEW`, `MEMBER`, `TRUSTED`), automated link scheme validation, disposable email rejection, Cloudflare Turnstile verification, community reporting, full admin moderation queues, session lifecycle management, and immutable audit logs.
2. **The Comprehension Layer**: Every technical article features an AI-generated, **verifiably grounded** "Check your understanding" quiz and "Ask this article" Q&A engine. Grounding validators guarantee that answers and citations are tied directly to verbatim article text. Authors receive real-time analytics on reader comprehension and confusing concepts.

---

## Architecture & System Overview

```
[ Public Readers / Authors / Admins ]
                 │
           Cloudflare WAF / Turnstile CAPTCHA
                 │
           Express 5 Gateway & Middleware Pipeline
           ├── Request ID & Structured Pino Logging
           ├── Helmet Security Headers & CORS
           ├── Tiered Rate Limiters (General, Auth, Public)
           └── JWT Authentication & Account Status Enforcement
                 │
    ┌────────────┴─────────────────────────────┐
    ▼                                          ▼
[ Trust & Publishing Engine ]      [ Comprehension Engine ]
├── Multi-Tier Trust Policies      ├── Grounded Quiz Generator
├── Disposable Email Blocker       ├── "Ask This Article" Q&A
├── Markdown Link Scheme Checker   ├── Verbatim Grounding Validator
├── Anti-Self Reporting System     └── Reader Confusion Analytics
└── Moderation Review Queue
    │                                          │
    └────────────────────┬─────────────────────┘
                         ▼
        [ Plain Postgres Durable Job Queue ]
        └── FOR UPDATE SKIP LOCKED Worker Pool
                         ▼
        [ PostgreSQL 16 via Prisma ORM ]
```

---

## Key Modules & Capabilities

### 1. Trust & Safety Layer
- **Tiered Author Policies**:
  - `NEW`: 5 links max per post, daily post cap, posts enter `PENDING_REVIEW` moderation queue upon publication. Auto-promoted to `MEMBER` after $\ge 2$ approved posts and account age $\ge 3$ days.
  - `MEMBER`: 20 links max per post, immediate publication to `PUBLISHED`.
  - `TRUSTED`: High-throughput trusted contributor.
- **Link & Scheme Protection**: Strict URI parsing rejects dangerous schemes (`javascript:`, `data:`, `file:`) and prevents link farming.
- **Anti-Abuse Registration**: Rejection of disposable email domains and optional Cloudflare Turnstile token validation.
- **Session Management**: Full visibility and control over active refresh token sessions (`GET /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/:id`, `POST /api/v1/auth/sessions/revoke-all-others`).
- **Admin Moderation & Governance**:
  - Moderation queue (`/api/v1/admin/moderation/queue`) for pending posts and open reports.
  - Post approval, rejection with feedback reason, and unpublishing.
  - Instant user account suspension with transactional session revocation.

### 2. Comprehension & Learning Layer
- **Grounded Article Quizzes**: Generates multiple-choice comprehension checks with source quote evidence tied to the text.
- **"Ask This Article" Grounded Q&A**: Semantic reader question answering restricted strictly to the article text, returning verified verbatim citations.
- **Reader Analytics & Confusion Heatmaps**: Authors can inspect quiz attempt pass rates, question accuracy, and specific options that caused reader confusion.

### 3. Plain PostgreSQL Background Job Queue
- **Zero External Infrastructure**: Built directly on PostgreSQL using `FOR UPDATE SKIP LOCKED` row-level locking.
- **Reliability & Backoff**: Automatic retry scheduling with exponential backoff and dead-letter terminal state (`FAILED`) when `maxAttempts` is reached.

### 4. Core Publishing & Engagement
- **Canonical Tag Normalization**: Real-time cleaning, deduplication, and consolidation of tag names.
- **Deterministic SEO Slugs**: Collision-resistant slug generation with immutability once published.
- **Threaded Comments & In-App Notifications**: Deep nested comment trees with email notification dispatch.
- **Engagement Feed**: Post likes, user bookmarks, and public cached read feeds.

---

## Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | Node.js 22+ / TypeScript 7 | ES Modules, strict typing |
| **HTTP Framework** | Express 5 | Next-generation lightweight HTTP framework |
| **Database & ORM** | PostgreSQL 16 / Prisma 6 | Relational schema with additive versioned migrations |
| **Validation** | Zod | Strict runtime schema validation across API and AI boundaries |
| **AI Copilot** | Google Gemini (`gemini-2.5-flash`) | Grounded quiz generation and article Q&A engine |
| **Email Delivery** | Brevo HTTP API / Console | Transactional email with fallback transport |
| **Background Jobs** | PostgreSQL Row Locks | Transactional `SKIP LOCKED` job queue |
| **Testing** | Vitest 5 & Supertest | 144 unit and integration tests across 23 test files |
| **Documentation** | OpenAPI 3.1 & Swagger UI | Living documentation built directly from Zod domain schemas |

---

## API Summary

### Authentication & Sessions
- `POST /api/v1/auth/register` — Register a new organization and owner account.
- `POST /api/v1/auth/login` — Authenticate and obtain JWT access + refresh tokens.
- `GET /api/v1/auth/sessions` — List active login sessions with device metadata.
- `DELETE /api/v1/auth/sessions/:id` — Revoke a specific session.
- `POST /api/v1/auth/sessions/revoke-all-others` — Revoke all sessions except the current one.
- `POST /api/v1/auth/verify-email` — Verify email via token.
- `POST /api/v1/auth/forgot-password` & `reset-password` — Secure password recovery.

### Posts & Comprehension
- `POST /api/v1/posts` — Create a new article (enforces link caps and trust policies).
- `PATCH /api/v1/posts/:id/publish` — Publish article (NEW accounts move to `PENDING_REVIEW`).
- `POST /api/v1/posts/:postId/quiz/generate` — Generate grounded multiple-choice quiz (Author/Admin).
- `GET /api/v1/posts/:postId/quiz` — Retrieve quiz questions (omits answers).
- `POST /api/v1/posts/:postId/quiz/attempt` — Submit quiz attempt and receive instant feedback.
- `POST /api/v1/posts/:postId/ask` — Ask question and get grounded answer with quotes.
- `GET /api/v1/posts/:postId/analytics/comprehension` — Reader confusion & accuracy analytics.

### Trust & Moderation
- `POST /api/v1/reports` — Report abusive posts, comments, or users (requires verified email).
- `GET /api/v1/admin/moderation/queue` — View pending review posts and reports (Admin/Owner).
- `POST /api/v1/admin/posts/:id/approve` — Approve pending post.
- `POST /api/v1/admin/posts/:id/reject` — Reject post with feedback.
- `POST /api/v1/admin/users/:id/suspend` — Suspend user and revoke active sessions.

---

## Security Documentation

- **Threat Model**: [`docs/THREAT_MODEL.md`](file:///Users/rajendrabist/Desktop/content-platform/docs/THREAT_MODEL.md) (STRIDE methodology)
- **Security Policy**: [`docs/SECURITY.md`](file:///Users/rajendrabist/Desktop/content-platform/docs/SECURITY.md)
- **OWASP ASVS Verification**: [`docs/ASVS_CHECKLIST.md`](file:///Users/rajendrabist/Desktop/content-platform/docs/ASVS_CHECKLIST.md) (Level 1 compliant)
- **API Contract**: [`docs/API_CONTRACT.md`](file:///Users/rajendrabist/Desktop/content-platform/docs/API_CONTRACT.md)

---

## Running Locally

```bash
# 1. Install dependencies
npm ci

# 2. Apply database migrations
npm run start:prod # Or: npx prisma migrate deploy

# 3. Verify environment variables
npm run check:env

# 4. Run test suite
npm test

# 5. Start development server
npm run dev
```
Interactive Swagger API documentation is available at `http://localhost:3000/api/v1/docs`.
