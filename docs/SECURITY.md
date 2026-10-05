# Security Policy

## Supported Versions

Security updates are actively applied to the main production branch:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Reporting a Vulnerability

We take the security of Chronicle very seriously. If you discover a security vulnerability, please report it responsibly:

1. **Do not create a public GitHub issue.**
2. Email your findings directly to the security team at `security@chronicle.local` (or reach out to the project administrator).
3. Include detailed reproduction steps, request payloads, and expected vs. observed impact.

### Response Timeline
- **Initial Response:** Within 24 hours.
- **Triage & Status Update:** Within 72 hours.
- **Fix & Disclosure:** Coordinated release within 14 days of confirmation.

---

## Security Architecture & Practices

- **Strict Input Validation:** All inputs are validated via Zod schemas.
- **Least Privilege Access Control:** Multi-tenant organization boundaries and granular role-based authorization.
- **Token Security:** Short-lived access tokens (15 minutes), revocable database-backed refresh tokens (30 days), and full session lifecycle management.
- **Transport Security:** Strict HTTPS enforcement in production, HSTS, secure cookie attributes, and Helmet header protection.
- **Audit Trails:** Security-sensitive operations (authentication, role updates, suspensions, moderation decisions) are recorded immutably in the audit log.
