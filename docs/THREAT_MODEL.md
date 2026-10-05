# Chronicle Security Threat Model (STRIDE)

This document presents the STRIDE threat model for **Chronicle** (`content-platform`), analyzing threats, mitigations, and operational controls across the platform's Trust and Comprehension layers.

---

## 1. System Overview & Trust Boundaries

```
[ Unauthenticated Internet ]
           │
     Cloudflare / CDN (Turnstile Captcha, WAF)
           │
     Reverse Proxy / TLS (Render.com)
           │
   ┌───────▼─────────────────────────────────────────────────┐
   │ Express API Gateway                                     │
   │  - Request ID & Access Logger                           │
   │  - Rate Limiters (General, Auth, Limiter tiers)         │
   │  - Helmet Security Headers                              │
   │  - Strict Zod Input Validation                          │
   │  - JWT Authentication & Role/Trust Verification         │
   └───────┬─────────────────────────────────────────────────┘
           │
   ┌───────▼─────────────────────────────────────────────────┐
   │ Business Domain Services                                │
   │  - Organization Tenancy Boundary                        │
   │  - Trust Policy & Moderation Life-cycle                 │
   │  - Canonical Tag Normalization                          │
   │  - Immutable Audit Logging                              │
   └───────┬─────────────────────────────────────────────────┘
           │
   ┌───────▼─────────────────────────────────────────────────┐
   │ Persistence & External Integrations                     │
   │  - PostgreSQL (Prisma ORM, Parameterized Queries)       │
   │  - Brevo Email Delivery (Transactional)                 │
   │  - Google Gemini API (Structured Prompting)             │
   └─────────────────────────────────────────────────────────┘
```

---

## 2. STRIDE Analysis & Mitigations

### 1. Spoofing (Identity & Authenticity)
- **Threat 1: Disposable Email Abuse & Sybil Registrations**
  - *Risk:* Spammers create disposable accounts to flood public lists.
  - *Mitigation:* Deny-list validation for disposable domains, Cloudflare Turnstile token validation, and mandatory email verification before reporting or interaction.
- **Threat 2: JWT Token Forgery / Tampering**
  - *Risk:* Attacker crafts artificial JWTs to impersonate users or escalate roles.
  - *Mitigation:* HMAC SHA-256 signature verification with minimum 32-character secret key. Access tokens expire in 15 minutes.
- **Threat 3: Credential Guessing & Password Brute-Force**
  - *Risk:* Automated credential stuffing attacks.
  - *Mitigation:* Bcrypt password hashing (10 salt rounds), dedicated strict rate limiting on `/auth/login` (5 req / 15 min), constant-time lookup behavior.

### 2. Tampering (Data Integrity)
- **Threat 1: Markdown Link Scheme Injection (`javascript:`, `data:`)**
  - *Risk:* Malicious authors embed XSS or phishing URI schemes into article content.
  - *Mitigation:* `validateContentLinks` parses Markdown AST/regex and rejects any scheme other than `http://` and `https://`.
- **Threat 2: Tenant Cross-Contamination**
  - *Risk:* User from Organization A alters posts/data of Organization B.
  - *Mitigation:* All mutation queries are strictly scoped by `organizationId` derived from the verified JWT payload.
- **Threat 3: Session Hijacking & Stolen Refresh Tokens**
  - *Risk:* Stolen refresh token enables prolonged unauthorized access.
  - *Mitigation:* Database-backed refresh tokens storing `userAgent`, `ipAddress`, and `lastUsedAt`. Immediate revocation on password change, password reset, account suspension, or via `/auth/sessions`.

### 3. Repudiation (Accountability)
- **Threat: Malicious actions taken without traceability**
  - *Risk:* Admins or users claim they did not perform an action (e.g. deleting a post or suspending an account).
  - *Mitigation:* Centralized `AuditLog` service records security events with timestamp, acting user ID, organization ID, IP address, user agent, and contextual payload metadata.

### 4. Information Disclosure (Confidentiality)
- **Threat 1: User Enumeration on Auth Endpoints**
  - *Risk:* Probing `/auth/forgot-password` or `/auth/resend-verification` to discover registered users.
  - *Mitigation:* Uniform generic success responses regardless of whether the user exists.
- **Threat 2: Internal Stack Traces or DB Error Leaks**
  - *Risk:* Raw SQL errors leaking schema details to clients.
  - *Mitigation:* Centralized error handler sanitizes all HTTP 500 responses (`Internal server error`), logging full error details with unique `requestId` server-side only.

### 5. Denial of Service (Availability)
- **Threat 1: Payload Flooding**
  - *Risk:* Massive JSON payloads exhausting memory.
  - *Mitigation:* Express body parser strictly capped at `100kb`.
- **Threat 2: Public Endpoint Scraping / Spamming**
  - *Risk:* Aggressive crawlers overwhelming database connection pool.
  - *Mitigation:* Express rate limiters (`express-rate-limit`) configured per endpoint class (General: 100/min, Auth: 10/15min, Public read: cached + indexed).
- **Threat 3: Trust-Level Link & Post Flood**
  - *Risk:* New accounts posting massive volumes of link farms.
  - *Mitigation:* `NEW` trust level restricts posts to 5 links and maximum 3 posts per day; posts require moderation approval (`PENDING_REVIEW`) before public indexing.

### 6. Elevation of Privilege (Authorization)
- **Threat 1: Member executing Admin actions**
  - *Risk:* Normal members accessing `/api/v1/admin/*` routes.
  - *Mitigation:* Strict `authorize(['ADMIN', 'OWNER'])` middleware combined with database status checks on every authenticated request.
- **Threat 2: Suspended User Continuing Active Access**
  - *Risk:* Suspended user using existing valid tokens.
  - *Mitigation:* `authenticate` middleware queries DB and immediately rejects any account with `status: 'SUSPENDED'` with HTTP 403. Admin suspension immediately deletes all active refresh tokens in a database transaction.
