# TaxAce Dashboard — Vercel + Neon Rebuild

This is the standalone migration of the TaxAce Tax Prep Dashboard. The original React/tRPC interface and workflow logic are preserved. Manus hosting, database, AI, notifications, and scheduled-task dependencies have been replaced.

## Stack

- Vite + React frontend
- Express + tRPC Vercel serverless API
- Neon PostgreSQL + Drizzle ORM
- Local password authentication with database-backed sessions and TOTP MFA
- OpenAI API for optional AI briefings
- Slack incoming webhook for optional operations/security alerts
- Vercel Cron for the daily briefing

## Local setup

1. Copy `.env.example` to `.env.local` and fill in test values. Never commit this file.
2. Create a Neon project and use the pooled URL for `DATABASE_URL` and direct URL for `DATABASE_URL_UNPOOLED`.
3. Run `pnpm install`.
4. Run `pnpm db:generate` and `pnpm db:migrate`.
5. Create the initial owner with temporary environment variables:
   `SEED_OWNER_EMAIL`, `SEED_OWNER_NAME`, and `SEED_OWNER_PASSWORD`; then run `pnpm seed:owner`.
6. Run `pnpm dev`. The API runs on port 3000 and Vite proxies `/api` requests.

## Synthetic test data

`sample-data/canopy-synthetic-test-data.csv` contains 60 fictional records across the dashboard workflow. It contains no real client names, email addresses, tax IDs, financial amounts, or other PII.

- Manual test: sign in, open Import Data, and upload the CSV.
- Neon seed test: after migrations, run `pnpm seed:synthetic` once.
- Duplicate protection: running the seed again does not insert another copy.

## Vercel setup

Import the private GitHub repository into Vercel and add the variables listed in `.env.example`. Use only synthetic or redacted CSV files until authorization, roles, MFA, webhook authentication, and audit logging pass the launch checklist.

Run database migrations from a trusted administrator machine or CI job using `DATABASE_URL_UNPOOLED`; do not run schema changes automatically in every serverless deployment.

## Required launch checks

- Owner/admin/preparer access restrictions
- Forced temporary-password change
- MFA enrollment and recovery
- Session idle expiry and revocation
- Valid and invalid Zapier secrets
- Current and legacy Canopy CSV parsing
- Duplicate CSV rejection
- Vercel Cron authorization through `CRON_SECRET`
- Password-reset email delivery
- IP controls kept disabled until every legitimate access route is tested

The original production database and secrets were not included in the Manus backup. Restore only through an approved encrypted export; otherwise begin with a clean Neon database.
