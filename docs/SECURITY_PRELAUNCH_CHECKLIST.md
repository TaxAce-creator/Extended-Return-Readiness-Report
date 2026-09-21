# TaxAce Tax Prep Dashboard — Security Pre-Launch Checklist

**Reviewed:** September 2, 2026  
**Scope:** Standalone TaxAce email/password authentication, client tax-work data, Canopy CSV ingestion, privileged dashboard access, and browser transport protections.

## Identity and Credential Controls

| Control | Verification evidence | Status |
|---|---|---|
| Local TaxAce email/password authentication only | `localAuth` router and `ta_session` cookie flow are the active dashboard identity path. | Pass |
| Strong password policy | Server requires at least 12 characters with uppercase, lowercase, number, and special character. | Pass |
| Password reuse prevention | Previous password hashes are retained in the password-history table and checked before a change or reset. | Pass |
| Password expiration | Owner/admin credentials expire after 90 days; standard users after 180 days. | Pass |
| Secure reset process | Reset tokens are SHA-256 hashed at rest, expire after 15 minutes, and revoke existing sessions after completion. | Pass |
| Brute-force protection | Five failed attempts lock an account for 30 minutes; routes also apply rate limits. | Pass |

## Session, MFA, and Authorization Controls

| Control | Verification evidence | Status |
|---|---|---|
| Opaque, database-backed sessions | Browser receives a random session token only; the database retains its hash, expiry, activity time, device context, and revocation status. | Pass |
| Session lifespan and inactivity limit | Standard sessions expire after 8 hours, privileged sessions after 4 hours, and all sessions expire after 30 minutes idle. | Pass |
| Concurrent-session limit | A maximum of three active sessions is retained per user; the oldest is revoked when exceeded. | Pass |
| Session revocation | Users can view and revoke their own sessions from **Account Security**; admins also have the same view in **Settings → Security**. | Pass |
| Privileged MFA | TOTP MFA is required for owner/admin dashboard authorization; TOTP secrets are encrypted at rest and backup codes are hashed. | Pass |
| MFA challenge protection | The challenge rotates the pending session on success and has a five-attempt/five-minute rate limit. | Pass |
| RBAC enforcement | Server procedures enforce `owner`, `admin`, `preparer`, and `user` policies; client navigation is supplementary only. | Pass |
| Owner-account safeguards | Only the owner may create or assign privileged access, and the owner account cannot be demoted from the dashboard. | Pass |

## Platform and Operations Controls

| Control | Verification evidence | Status |
|---|---|---|
| Transport/browser headers | `X-Content-Type-Options`, `X-Frame-Options`, CSP, Permissions Policy, Referrer Policy, and production HSTS are configured in `server/_core/index.ts`. | Pass |
| Cookie configuration | Session cookie is `HttpOnly`, `Secure`, path-restricted, and `SameSite=Lax`. `Lax` is retained as the deployment-compatible setting for the TaxAce app gateway; it protects unsafe cross-site requests while preserving the established sign-in flow. | Approved exception |
| IP allowlist | The configurable IP allowlist and global enforcement setting exist; enforcement is disabled by default until every authorized device/network is entered. | Pass — operational activation required |
| Security audit trail | Login, failure, lock, logout, password, MFA, role, IP, session, and export events are recorded; filtered CSV audit export records its own export event. | Pass |
| Canopy webhook protection | `/api/webhooks/zapier-canopy` requires the configured webhook secret; unauthenticated dashboard procedures are protected. | Pass |

## Verification Record

| Check | Result |
|---|---|
| TypeScript | `pnpm check` passed |
| Automated tests | `pnpm test` passed — 23 tests across 6 suites |
| Production build | `pnpm build` passed |
| Browser header check | Local running server returned CSP, X-Frame-Options, nosniff, Referrer Policy, and Permissions Policy headers |
| Visual review | Login and MFA challenge screens rendered successfully in the project preview |

## Required Operational Actions Before Broad Team Launch

1. Each owner and administrator must enroll an authenticator application after the next sign-in and save backup codes in the firm-approved password manager.
2. Add approved office and leadership-device IP addresses in **Settings → Security** before enabling IP blocking. Do not enable that control first.
3. Configure transactional SMTP before relying on the self-service password-reset email flow in production.
4. Repeat this checklist after any change to authentication, integrations, roles, or hosting.
