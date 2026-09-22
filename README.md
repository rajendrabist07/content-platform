<<<<<<< HEAD

# Content Platform API

Production-pattern backend built with Node.js, TypeScript, Express, Prisma, and PostgreSQL.

## API Documentation

https://documenter.getpostman.com/view/51591916/2sBYB2qmsV

## Features

- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- Posts, Comments (threaded), Tags (many-to-many)
- Rate limiting, Helmet, CORS
- 30 automated tests (unit + integration)
- Docker + Docker Compose
- CI/CD via GitHub Actions
READMEEOF


=======
# Content Platform API

Production-minded REST API for a multi-tenant content platform. The service provides JWT-based authentication, organization-scoped content management, posts, threaded comments, tags, health checks, and database-backed refresh-token sessions.

## Overview

Content Platform API is built as a modular TypeScript service with a clear separation between HTTP routes, controllers, services, repositories, validation, and persistence. It is designed for content teams that need authenticated collaboration across organizations while retaining a small, maintainable backend surface.

### Core capabilities

- Multi-tenant organizations and organization-scoped users and posts
- User registration, login, access-token refresh, and logout
- Role model with `OWNER`, `ADMIN`, and `MEMBER` roles
- Draft, published, and archived post lifecycle
- Slug-based post identity within an organization
- Nested comments and replies
- Reusable tags and post-tag relationships
- Soft-delete fields on primary content entities
- PostgreSQL persistence through Prisma ORM
- Request validation with Zod
- Security headers, CORS, rate limiting, and structured logging
- Database-aware health endpoint
- Unit and integration tests with Vitest and Supertest
- Docker Compose development environment

## Technology Stack

| Area             | Technology                       |
| ---------------- | -------------------------------- |
| Runtime          | Node.js 22+                      |
| Language         | TypeScript                       |
| HTTP framework   | Express 5                        |
| Database         | PostgreSQL 16                    |
| ORM              | Prisma 6                         |
| Validation       | Zod                              |
| Authentication   | JWT, bcryptjs                    |
| Security         | Helmet, CORS, express-rate-limit |
| Logging          | Pino and pino-pretty             |
| Testing          | Vitest and Supertest             |
| Containerization | Docker and Docker Compose        |

## Repository Structure

```text
.
├── prisma/                 # Prisma schema and versioned migrations
├── src/
│   ├── app/api/v1/         # Versioned HTTP route registration
│   ├── config/             # Environment validation
│   ├── core/               # Errors and logging
│   ├── lib/                # Shared infrastructure, including Prisma
│   ├── middleware/         # Authentication, authorization, errors, limits
│   ├── modules/            # Domain modules and business logic
│   ├── app.ts              # Express application factory
│   └── server.ts           # Process entry point
├── tests/
│   ├── integration/        # API-level tests
│   └── unit/               # Focused service tests
├── postman/                # Collections, environments, and API examples
├── .postman/               # Postman workspace export metadata
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Prerequisites

- Node.js 22 or newer
- npm
- PostgreSQL 16 or Docker Desktop
- A JWT secret containing at least 32 characters

## Quick Start: Local Node.js

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a `.env` file in the project root:

   ```dotenv
   NODE_ENV=development
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/content_platform_dev?schema=public
   PORT=3000
   JWT_SECRET=replace-this-with-a-random-secret-of-at-least-32-characters
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=30d
   ```

3. Generate the Prisma client and apply migrations:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Start the API:

   ```bash
   npx tsx src/server.ts
   ```

The API is available at `http://localhost:3000`.

## Quick Start: Docker Compose

Docker Compose starts the API and PostgreSQL with a persistent database volume:

```bash
docker compose up --build -d
docker compose exec app npx prisma migrate deploy
```

The API is available at `http://localhost:3000`. PostgreSQL is exposed to the host at `localhost:5433`.

View service logs and stop the environment with:

```bash
docker compose logs -f app
docker compose down
```

The Compose file contains development credentials for local use only. Replace them before using the service in any shared or production environment.

## Configuration

| Variable                 | Required | Default       | Description                            |
| ------------------------ | -------- | ------------- | -------------------------------------- |
| `NODE_ENV`               | No       | `development` | `development`, `production`, or `test` |
| `DATABASE_URL`           | Yes      | -             | PostgreSQL connection string           |
| `PORT`                   | No       | `3000`        | HTTP port                              |
| `JWT_SECRET`             | Yes      | -             | Signing secret, minimum 32 characters  |
| `JWT_EXPIRES_IN`         | No       | `15m`         | Access-token lifetime                  |
| `JWT_REFRESH_EXPIRES_IN` | No       | `30d`         | Refresh-token lifetime                 |

Environment variables are validated at startup. Invalid or missing required values stop the process before the server begins listening.

## API Reference

All routes are prefixed with `/api/v1`.

### Health

| Method | Endpoint  | Auth   | Purpose                                                                         |
| ------ | --------- | ------ | ------------------------------------------------------------------------------- |
| `GET`  | `/health` | Public | Returns API and database health; returns `503` when the database is unavailable |

### Authentication

| Method | Endpoint         | Auth   | Purpose                                               |
| ------ | ---------------- | ------ | ----------------------------------------------------- |
| `POST` | `/auth/register` | Public | Register a user in an organization                    |
| `POST` | `/auth/login`    | Public | Authenticate and issue access and refresh tokens      |
| `POST` | `/auth/refresh`  | Public | Rotate or renew an access token using a refresh token |
| `POST` | `/auth/logout`   | Public | Revoke a refresh-token session                        |

### Posts

| Method   | Endpoint             | Auth         | Purpose        |
| -------- | -------------------- | ------------ | -------------- |
| `GET`    | `/posts`             | Bearer token | List posts     |
| `GET`    | `/posts/:id`         | Bearer token | Get one post   |
| `POST`   | `/posts`             | Bearer token | Create a post  |
| `PATCH`  | `/posts/:id`         | Bearer token | Update a post  |
| `PATCH`  | `/posts/:id/publish` | Bearer token | Publish a post |
| `DELETE` | `/posts/:id`         | Bearer token | Delete a post  |

### Comments

| Method   | Endpoint                      | Auth         | Purpose                  |
| -------- | ----------------------------- | ------------ | ------------------------ |
| `POST`   | `/posts/:postId/comments`     | Bearer token | Add a comment or reply   |
| `GET`    | `/posts/:postId/comments`     | Bearer token | List comments for a post |
| `PATCH`  | `/posts/:postId/comments/:id` | Bearer token | Update a comment         |
| `DELETE` | `/posts/:postId/comments/:id` | Bearer token | Delete a comment         |

### Tags

| Method   | Endpoint                     | Auth         | Purpose                  |
| -------- | ---------------------------- | ------------ | ------------------------ |
| `POST`   | `/tags`                      | Bearer token | Create a tag             |
| `GET`    | `/tags`                      | Bearer token | List tags                |
| `POST`   | `/posts/:postId/tags`        | Bearer token | Attach a tag to a post   |
| `DELETE` | `/posts/:postId/tags/:tagId` | Bearer token | Remove a tag from a post |

Authenticated requests use the standard header:

```http
Authorization: Bearer <access-token>
```

The repository includes Postman collections and environments under `postman/` for manual API exploration and regression checks.

## Data Model

The Prisma schema defines these principal entities:

- `Organization`: tenant boundary for users and posts
- `User`: authenticated member with an organization and role
- `Profile`: optional one-to-one user profile
- `Post`: organization-owned content authored by a user
- `Tag`: reusable label connected to posts through `TagsOnPosts`
- `Comment`: post comment with optional parent reply
- `RefreshToken`: persisted refresh-token session with expiry

The schema includes foreign-key constraints, unique organization-scoped post slugs, indexes for common lookups, cascading deletes where appropriate, and soft-delete timestamps on selected entities.

## Development Commands

```bash
npm test                 # Run the complete test suite
npm run test:unit        # Run unit tests
npm run test:integration # Run API integration tests
npm run test:watch       # Run Vitest in watch mode
npx prisma studio       # Open the Prisma data browser
npx prisma migrate dev   # Create and apply a development migration
```

The test environment is loaded from `.env.test`. Integration tests require a reachable PostgreSQL database configured by that file.

## Architecture

The request path follows a predictable layered flow:

```text
HTTP request
    -> Express route
    -> middleware (rate limit, authentication, authorization)
    -> controller
    -> validation and service
    -> repository
    -> Prisma Client
    -> PostgreSQL
```

The `createApp()` factory in `src/app.ts` makes the HTTP application independently testable, while `src/server.ts` owns process startup. Centralized error middleware converts application errors into HTTP responses, and environment parsing prevents invalid runtime configuration.

## Security and Operations

- Passwords are hashed with bcryptjs and are never stored as plaintext.
- Access tokens are short-lived by default; refresh tokens are persisted with expiration timestamps.
- Helmet adds common HTTP security headers.
- CORS is configured by environment mode; production should replace the placeholder origin in `src/app.ts`.
- General and login-specific rate limits protect public endpoints from abuse.
- Zod validates incoming authentication and domain payloads.
- Pino provides structured application logging.
- The health endpoint verifies database connectivity with `SELECT 1`.
- Secrets and environment files are excluded from Git via `.gitignore`.

Before production deployment, provide managed secrets, restrict CORS to trusted origins, use a production PostgreSQL instance, review rate limits, run migrations as a release step, and terminate TLS at the edge or ingress layer.

## Git and Contribution Workflow

1. Create a focused branch from `main`.
2. Keep commits small and describe the behavior they introduce or fix.
3. Add or update unit and integration coverage for changed behavior.
4. Run the relevant test suites and database migrations locally.
5. Review the diff for secrets, generated files, and unrelated changes.
6. Open a pull request with a summary, test evidence, migration notes, and API contract changes.

Do not commit `.env`, `.env.docker`, `.env.test`, credentials, tokens, or local database artifacts.

## License

This project currently declares the ISC license in `package.json`.
>>>>>>> 93c4a36 (Add README with API documentation link)
