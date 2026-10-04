# Content Platform API

Production-grade, multi-tenant REST API built with Node.js, TypeScript, Express, Prisma, and PostgreSQL.

Designed with **Clean Architecture** (Route → Middleware → Controller → Service → Repository → Prisma), fully validated with **Zod**, documented with **OpenAPI 3.1 / Swagger**, equipped with **Google Gemini AI copilot**, transactional email infrastructure, threaded notifications, SEO slugs, engagement metrics, security audit logs, and tested with **94 unit and integration tests**.

---

## Key Capabilities & Architecture

- **Clean Architecture & Decoupled Domain**: Strict separation of HTTP handlers, business services, repositories, and persistence.
- **Multi-Tenant Isolation**: Users, posts, comments, tags, and audit logs are strictly scoped by Organization.
- **Authentication & Security**:
  - JWT access tokens (15m) + revocable database-backed refresh tokens (30d).
  - Role-Based Access Control (RBAC): `OWNER`, `ADMIN`, `MEMBER`.
  - Secure Email Verification & Password Reset workflows with SHA-256 tokens and constant-time execution against user enumeration.
  - Brute force protection with tiered rate limiters (`generalLimiter`, `authActionLimiter`).
  - Security audit logging recording authentication lifecycle events and profile mutations.
- **AI Copilot (Google Gemini 2.5)**:
  - `POST /api/v1/ai/suggest`: Intelligent title, tags, and summary generation.
  - `POST /api/v1/ai/improve`: Prose clarity, structure improvement, critique, and readability scoring.
  - `POST /api/v1/ai/outline`: Comprehensive structured article outline generation with section points.
  - Delimiter-wrapped prompts (`<post_content>`, `<outline_topic>`) and Zod schema-enforced output sanitization.
- **Public SEO & Publishing Pipeline**:
  - `GET /api/v1/public/posts`: Fast cached public read endpoints for published content.
  - Deterministic, collision-resistant slug generation with immutability guarantees once published.
  - Dynamic XML sitemap generator (`/api/v1/public/sitemap`) with cache headers.
- **Engagement & Social**:
  - Post likes with toggle endpoints and optimistic like count aggregation.
  - User bookmarks with paginated bookmark feeds (`/api/v1/bookmarks`).
  - User profile management with avatars, bios, and notification preferences.
- **In-App & Email Notifications**:
  - Async comment and reply notification dispatch.
  - In-app notification inbox with unread counts and batch mark-as-read endpoints.
  - Transactional email transport (Brevo API + Console dev fallback) with exponential backoff retries.
- **Observability & Ops**:
  - Structured JSON logging with `Pino` and request tracking via `X-Request-Id`.
  - Live liveness (`/api/v1/health`) and database readiness (`/api/v1/ready`) probes.
  - Graceful shutdown draining active HTTP connections and database pools on `SIGTERM` / `SIGINT`.
- **Developer Experience**:
  - OpenAPI 3.1 interactive Swagger UI at `/api/v1/docs` (generated from real Zod schemas).
  - Seed script populating organizations, users, posts, threaded comments, tags, and bookmarks.
  - Automated GitHub Actions CI pipeline running typechecking, database migrations, and 94 Vitest test suites.

---

## Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | Node.js 20+ / TypeScript | ES Modules, strict typing, TS native preview |
| **Framework** | Express 5 | Next-generation lightweight HTTP framework |
| **Database & ORM** | PostgreSQL 16 / Prisma 6 | Relational schema with additive versioned migrations |
| **Validation** | Zod | Runtime schema validation on requests and AI outputs |
| **AI Copilot** | Google Gemini (`gemini-2.5-flash`) | Structured generative content suggestions |
| **Email** | Brevo HTTP API / Console | Transactional email with fallback transport |
| **Documentation** | OpenAPI 3.1 / Swagger UI | Living documentation built from domain Zod schemas |
| **Testing** | Vitest & Supertest | Parallel unit and multi-tenant integration test runner |
| **CI/CD** | GitHub Actions | Automated workflow for linting, migration, and testing |

---

## Getting Started

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 16 (local or Docker)
- npm

### 2. Local Setup

Clone the repository and install dependencies:
```bash
git clone https://github.com/rajendrabist07/content-platform.git
cd content-platform
npm ci
```

Create your local `.env` configuration:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/content_platform_dev?schema=public

JWT_SECRET=your-random-32-character-jwt-secret-string-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

GEMINI_API_KEY=your-google-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
FRONTEND_URL=http://localhost:3000

EMAIL_FROM_NAME="Content Platform"
EMAIL_FROM_ADDRESS="noreply@contentplatform.com"
BREVO_API_KEY=
```

### 3. Database Migrations & Seeding

Apply database migrations:
```bash
npx prisma migrate dev
```

Seed the database with sample organizations, users, posts, and comments:
```bash
npm run db:seed
```

### 4. Running the Server

Start the local development server with hot-reloading:
```bash
npm run dev
```

The API is live at `http://localhost:3000` with Swagger UI at `http://localhost:3000/api/v1/docs`.

---

## Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | Secret for signing access tokens (>= 32 chars) |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `30d` | Refresh token lifetime |
| `GEMINI_API_KEY` | No | — | Google Gemini API key for AI features |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model ID |
| `BREVO_API_KEY` | No | — | Brevo API key for real transactional email |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated CORS allowed origins |
| `FRONTEND_URL` | No | `http://localhost:3000` | Base frontend URL for email verification links |
| `PORT` | No | `3000` | Server HTTP port |

---

## API Endpoints Reference

All endpoints are versioned under `/api/v1`.

### Public Endpoints (No Auth Required)
- `GET /health` — Application liveness probe
- `GET /ready` — Database connectivity readiness check
- `GET /docs` — Interactive Swagger UI documentation
- `GET /docs.json` — OpenAPI 3.1 JSON document
- `GET /public/posts` — List published posts with tag filtering and caching
- `GET /public/posts/:slug` — Fetch published post details by SEO slug
- `GET /public/tags` — List tags with published post counts
- `GET /public/sitemap` — XML sitemap for search indexing

### Authentication (`/auth`)
- `POST /auth/register` — Register user and new organization (or join existing)
- `POST /auth/login` — Authenticate and receive access + refresh token
- `POST /auth/verify-email` — Verify email via token
- `POST /auth/resend-verification` — Resend verification email
- `POST /auth/forgot-password` — Request password reset email
- `POST /auth/reset-password` — Reset password using token
- `POST /auth/change-password` — Change password (authenticated)
- `POST /auth/refresh` — Issue new access token using refresh token
- `POST /auth/logout` — Revoke refresh token

### User Profiles & Bookmarks (`/users`, `/bookmarks`)
- `GET /users/me` — Fetch current user profile and preferences
- `PATCH /users/me` — Update bio, avatar, notification settings
- `GET /bookmarks` — Paginated list of user bookmarked posts

### Posts (`/posts`)
- `GET /posts` — List organization posts (supports `status` filter, pagination)
- `POST /posts` — Create a new post (generates SEO slug)
- `GET /posts/:id` — Get post details by ID
- `PUT /posts/:id` — Update post content and tags
- `PATCH /posts/:id/publish` — Publish post and lock slug
- `DELETE /posts/:id` — Delete post (author, ADMIN, or OWNER)
- `POST /posts/:id/like` — Toggle like on post
- `POST /posts/:id/bookmark` — Toggle bookmark on post

### Threaded Comments (`/posts/:postId/comments`)
- `POST /posts/:postId/comments` — Add top-level comment or threaded reply (`parentId`)
- `GET /posts/:postId/comments` — Get nested comments tree
- `DELETE /posts/:postId/comments/:id` — Delete comment (author, ADMIN, or OWNER)

### Tags (`/tags`)
- `GET /tags` — List organization tags
- `POST /tags` — Create a new tag

### In-App Notifications (`/notifications`)
- `GET /notifications` — Paginated list of user notifications
- `GET /notifications/unread-count` — Unread count for UI badges
- `PATCH /notifications/:id/read` — Mark notification as read
- `POST /notifications/read-all` — Mark all user notifications as read

### AI Copilot (`/ai`)
- `POST /ai/suggest` — Generate optimized titles, tags, and summary
- `POST /ai/improve` — Content editing, tone refinement, and readability score
- `POST /ai/outline` — Generate article structure and talking points

### Security & Audit Logs (`/audit-logs`)
- `GET /audit-logs` — List tenant audit log entries (OWNER and ADMIN only)

---

## Database Migrations & Production Deployments

This project follows an **additive-only, zero-downtime** migration strategy. Full documentation is available in [docs/MIGRATIONS.md](docs/MIGRATIONS.md).

### Local Migration Development
```bash
# Generate a new migration from schema changes
npx prisma migrate dev --name <migration_name>

# Apply pending migrations locally
npx prisma migrate deploy

# Validate schema synchronization & drift
npm run check:env
npx prisma validate
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```

### Production Hosting on Render
- **Build Command**: `npm ci && npx prisma generate && npm run build`
- **Start Command**: `npm run start:prod` (applies pending migrations automatically via `prisma migrate deploy` before launching Express)

---

## Troubleshooting Common Issues

| Error | Cause | Resolution |
| :--- | :--- | :--- |
| `P2021: Table does not exist` | Code deployed before migrations were applied to the database. | Ensure Render Start Command is set to `npm run start:prod`, or run `npx prisma migrate deploy` manually. |
| `P2022: Column does not exist` | Schema column missing in the target database. | Run `npx prisma migrate deploy`. |
| `503 Service Unavailable on /api/v1/ready` | Database disconnected or incomplete migration. | Inspect `/api/v1/ready` output for `failedMigration` details and check database connectivity. |
| `429 Too Many Requests` | Rate limit threshold reached on auth routes. | Wait for the rate limit window to expire or configure higher thresholds in development. |

---

## Testing & Quality Assurance

The codebase includes **105 unit and integration tests** verifying authentication, authorization boundaries, tenant isolation, AI parsing, public feeds, bookmarks, security logs, migration readiness, and environment drift guards.

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Type check
npx tsc --noEmit

# Execute automated smoke test suite against running server
./scripts/smoke.sh http://localhost:3000
```

---

## Seed Accounts (Post-Seed)

After running `npm run db:seed`, the following accounts are available for testing:

| Email | Password | Role | Organization |
| :--- | :--- | :--- | :--- |
| `owner@acme.com` | `password123` | `OWNER` | Acme Corporation |
| `admin@acme.com` | `password123` | `ADMIN` | Acme Corporation |
| `member@acme.com` | `password123` | `MEMBER` | Acme Corporation |
| `writer@techstart.io` | `password123` | `MEMBER` | TechStart AI |

---

## License

This project is licensed under the ISC License.
