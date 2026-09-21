# TaxAce Tax Prep Dashboard — TODO

## Completed Features
- [x] 23-stage workflow pipeline view
- [x] By Assignee workload tab
- [x] Team Accountability tab (HQ vs Remote)
- [x] Analytics tab with bottleneck analysis
- [x] Overdue Only quick filter toggle
- [x] Date range filter with presets
- [x] Status legend with color key
- [x] With Client status color
- [x] Pinned column / CRLF fix for raw Canopy exports
- [x] Zapier webhook auto-sync (Email → Zapier → Dashboard)
- [x] Database persistence for uploaded reports

## Tier 1 — Build This Week
- [x] Client Lookup / Client Journey tab — search any client, see full record
- [x] At-Risk deadline filter — clients due within 14 days not yet at Final Review
- [x] No-Status alert panel — unowned tasks callout on Pipeline View
- [x] Preparer capacity indicators — capacity bar per preparer in Assignee and Team tabs

## Tier 2 — Build This Month
- [x] Left sidebar navigation with Overview landing page (no upload-first experience)
- [x] Full aesthetic upgrade — premium dark sidebar, glassmorphism cards, gradient accents
- [x] Week-over-week pipeline comparison
- [ ] Time-in-stage tracking (days per stage per client)
- [x] Preparer Scorecard tab (throughput, overdue rate, return-type mix, revenue potential, composite score)
- [x] Revenue Summary panel (billing rates by return type, pipeline value breakdown, revenue by preparer)

## Tier 3 — This Quarter
- [ ] Deadline Risk Engine (projects April 15 completion risk per client)
- [ ] Client Activity Log (per-client notes for Circular 230 compliance)
- [ ] Extension Tracker
- [ ] Daily Digest email to owner

## P0 Security Fixes & taxYear Filter (Sprint May 2026)
- [x] Lock canopy procedures with protectedProcedure (auth required)
- [x] Add frontend auth gate — redirect unauthenticated users to login
- [x] Validate Zapier webhook with ZAPIER_WEBHOOK_SECRET (mandatory, not optional)
- [x] Add taxYear filter chip to SummaryBar
- [x] Wire taxYear filter through all views (Pipeline, Assignee, Teams, Analytics, Scorecard)

## Full Mode Sprint — All Remaining Audit Items (May 2026)

### P1 — This Week
- [x] Data age indicator in sidebar + stale data warning (amber flag when data > 48 hrs old)
- [x] Persist filters across sidebar navigation using React context (no more filter resets)

### P2 — This Sprint
- [x] Week-over-week pipeline comparison view (delta per stage, overdue rate trend)
- [x] Risk Score formula in AtRiskPanel (stages remaining × days urgency, color-coded triage)
- [x] Tax deadline calendar (all major deadlines + Deadline Countdown widget on Overview)
- [x] Configurable billing rates Settings page (owner-only, stored in database)

### P3 — Next Sprint
- [x] team_members table + Settings page (manage HQ vs Remote without code changes)
- [x] Audit log table + Admin panel (track who viewed/uploaded what data, compliance trail)
- [x] Bottleneck severity score in Analytics (risk-weighted, not just volume — already implemented)
- [ ] Preparer notes & flags on Scorecard (owner-only private notes per preparer)

### P4 — Roadmap
- [ ] ClientLookup → Canopy deep link (Copy Canopy Link button)
- [x] Stuck client detection (STUCK badge in ClientLookup — 14+ days overdue)
- [x] Mobile responsive layout (sidebar collapses to bottom nav on < 768px)

### Strategic Features
- [x] AI Daily Briefing on Overview (LLM-generated morning summary: top bottleneck, highest-risk client, preparer needing attention)

## CEO Morning View & Zapier Setup (May 2026)
- [x] CEO View page — 6 KPI cards (total active, overdue rate vs last week, revenue at risk placeholder, top bottleneck, most behind preparer, days to next deadline)
- [x] Wire CEO View into sidebar and Home.tsx routing (Crown icon, ⭐ badge, default landing page)
- [x] Zapier webhook endpoint documentation and step-by-step setup guide (6-step guide with troubleshooting)

## Sprint 1 — Phenomenal PM Roadmap (May 2026)

- [x] CSV deduplication — SHA-256 hash check on upload, reject duplicates with clear message
- [x] stageType classification — tag all 27 WORKFLOW_STAGES as active/waiting/review/complete/terminal
- [x] Clickable CEO View KPI cards — deep links to filtered Pipeline/Assignee views
- [x] briefingActions table — store AI action items with completedAt timestamp
- [x] AI briefing Mark Done UI — mark action items complete, LLM skips completed items next time
- [x] CEO View empty state — onboarding guide when no CSV uploaded yet

## Sprint 2 — Client Action Panel & Interactive Tools (May 2026)

- [x] clientNotes, clientFlags, clientReminders tables in database schema
- [x] clientActions tRPC router (notes CRUD, escalate flag, reminder procedures)
- [x] ClientActionPanel slide-over component (notes, escalate, reminder)
- [x] Wire ClientActionPanel into ClientLookup and PipelineView card
- [x] 4-week trend sparklines on CEO View KPI cards (all 6 cards)
- [x] Mobile-responsive sidebar (bottom nav on screens under 768px)
- [x] Scheduled AI briefing endpoint (POST /api/scheduled/briefing)
- [x] Daily 7 AM digest scheduled task

## Sprint 3 — Role-Based Access Control

- [x] Extend user role enum to include `preparer` (Amber) alongside existing `admin` and `user`
- [x] Migrate DB schema with new role
- [x] Add preparerProcedure server-side guard for preparer-accessible tRPC routes
- [x] Gate sidebar nav by role — preparer sees only: Import, Pipeline, Client Lookup, Analytics, Deadline Calendar
- [x] Gate routes by role — redirect preparer away from CEO View, Scorecard, WoW, Briefing, Settings
- [x] Onboarding instructions for Amber and Ivy

## Sprint 4 — Standalone Email/Password Authentication

- [x] Add passwordHash, resetToken, resetTokenExpiry, mustChangePassword fields to users table
- [x] Migrate DB schema
- [x] Server: localAuth.login — bcrypt verify, issue 8-hour JWT cookie
- [x] Server: localAuth.logout — clear cookie
- [x] Server: localAuth.forgotPassword — generate reset token, send email
- [x] Server: localAuth.resetPassword — verify token, set new password
- [x] Server: localAuth.adminSetPassword — admin sets any user's password
- [x] Server: localAuth.changePassword — user changes own password
- [x] Server: localAuth.listUsers / updateUserRole — admin team management
- [x] Login page — TaxAce branded, email + password, forgot password flow
- [x] ChangePassword page — forced on first login
- [x] ResetPassword page — token-based from email link
- [x] AuthGuard in App.tsx — redirects unauthenticated users to /login
- [x] Seed Nataly (admin), Ivy (admin), Amber (preparer) with temporary passwords
- [x] 19 tests passing across 5 test files

## Bug Fixes — June 9, 2026
- [x] Fix CSV parser to skip Canopy metadata header lines (was reading "Data extract produced by..." as header)
- [x] Fix CSV parser to handle Subtask column names (Subtask Name, Subtask Status, Client Name, Custom Field Value, Subtask Due Date, Task Tax Year, Task Return Type)
- [x] Fix getLatestCanopyReport to prefer task pipeline CSV over client archive CSV
- [x] Fix getLatestTwoReports to filter out archive CSVs for Week-over-Week comparison
- [x] Fix server-side KPI computation (computeKpisFromCsv) with same column name fixes
- [x] Add dashboard CSV validation warning for missing recommended and unrecognized columns; reject unusable reports missing task, status, or client data

## Security Hardening — taxace-auth-security Skill (June 2026)

### Layer 7 — RBAC Upgrades
- [x] Add `owner` role to users enum (schema + migration)
- [x] Add `ownerProcedure` middleware in server/_core/trpc.ts
- [x] Promote NZ (nataly@taxace.com) to `owner` role in DB
- [x] Update requireAdmin checks to accept both `owner` and `admin`

### Layer 9 — Brute Force Protection
- [x] Add failedLoginAttempts and lockedUntil columns to users table (schema + migration)
- [x] Lock account after 5 failed logins for 30 min; notify owner after 10
- [x] Rate limit login endpoint (10 req / 15 min per IP via express-rate-limit)
- [x] Rate limit forgotPassword endpoint (3 req / 60 min per email)
- [x] Show "Account locked" error message on login page

### Layer 5 — Session Hardening
- [x] Add sessions table to DB (id, userId, tokenHash, createdAt, lastActiveAt, expiresAt, ipAddress, userAgent, isRevoked)
- [x] Admin session duration: 4 hours (currently 8 for all)
- [x] Idle timeout: 30 min inactivity = auto-logout
- [x] Max 3 concurrent sessions per user; revoke oldest on exceed
- [x] Active sessions list in account settings with per-session Revoke button

### Layer 8 — Expanded Audit Log
- [x] Log user.login on successful login
- [x] Log user.login_failed on failed login attempt
- [x] Log user.locked when account is locked
- [x] Log user.logout on logout
- [x] Log user.password_changed on password change
- [x] Log user.password_reset_requested on forgot password
- [x] Log user.password_reset_completed on reset success
- [x] Log user.role_changed when admin changes a user's role
- [x] Log user.created when admin creates a new account

### Layer 4 — MFA (TOTP)
- [x] Add mfaSecret, mfaEnabled, mfaBackupCodes columns to users table
- [x] Install otpauth package
- [x] Server: mfa.setup — generate TOTP secret, return QR URI
- [x] Server: mfa.verify — validate TOTP code, enable MFA
- [x] Server: mfa.disable — admin-only, logged in audit log
- [x] MFA setup wizard in account settings (QR code + backup codes)
- [x] MFA verification step after login for MFA-enabled accounts
- [x] Enforce MFA setup route before owner/admin dashboard access when MFA is disabled (supersedes a passive banner)

### Layer 6 — IP Allowlisting
- [x] Add ip_allowlist table to DB (id, label, ipAddress, addedBy, addedAt, isActive)
- [x] Add ipBlockingEnabled setting to settings table
- [x] IP check middleware in server/_core/context.ts
- [x] IP Management admin page (add/edit/delete IPs with labels)
- [x] Global toggle to enable/disable IP blocking
- [x] Alert banner when IP blocking is on and current user IP is not on list

## Migration Backup & Rebuild Documentation — September 2026
- [x] Inventory current codebase, configuration, artifacts, accessible data, and project history
- [x] Create complete Manus migration folder structure with readme placeholders for non-applicable categories
- [x] Write master migration manifest and chronological project handoff/context documents
- [x] Write comprehensive TaxAce Tax Prep Dashboard rebuild blueprint (architecture, features, stack, schema, setup, recovery)
- [x] Document data dictionary, processing/validation rules, integrations, environment setup, visual style, and prompt library
- [x] Assemble safe code, source/reference artifacts, configuration templates, and database schema/export materials
- [x] Create new-account restoration guide, migration gaps report, version history, and final completeness audit
- [x] Package the complete migration folder as a downloadable ZIP archive

## Backup Reference Update — Daily Digest Options
- [x] Add both dashboard-only and secure-email daily-digest approaches to the migration package
- [x] Document decision criteria, prerequisites, secure restoration steps, and activation checklist for a new account
- [x] Refresh the full safe source snapshot, manifest, and integrity-verified ZIP archive

## Security Compliance Completion — September 2026
- [x] Add `passwordChangedAt`, password-history, and database-backed session tables through a schema-first migration
- [x] Enforce 12-character complexity, recent-password reuse prevention, and role-based password expiration on all password flows
- [x] Hash reset tokens, shorten token validity to 15 minutes, and revoke all sessions after a password reset or administrative password change
- [x] Replace JWT-only sessions with hashed database-backed sessions, 4-hour admin sessions, 8-hour standard sessions, 30-minute idle timeout, and a three-session maximum
- [x] Add active-session listing, single-session revoke, and revoke-all-other-sessions controls in account security settings
- [x] Encrypt stored TOTP secrets, enforce admin MFA at sign-in, rotate sessions after MFA, and rate-limit MFA challenges
- [x] Correct owner/admin authorization consistency and prevent owner demotion or non-owner assignment through the administration UI
- [x] Add filtered/exportable audit logs with export-event logging and required security actions
- [x] Add HTTP transport-security headers and validate cookie, IP-control, and origin/proxy behavior in the deployment environment
- [x] Add accessible password/MFA UX, comprehensive security tests, and complete the TaxAce pre-launch checklist
