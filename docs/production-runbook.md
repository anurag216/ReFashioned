# Production release runbook

## Source of truth

The `main` branch of GitHub repository `anurag216/ReFashioned` is the authoritative production source. A Replit workspace must not contain production-only application changes absent from GitHub.

## Pre-deployment

- [ ] PR CI and the `validate` job are green.
- [ ] Supabase database tests and the clean-local Playwright security suite are green.
- [ ] Paying-pilot acceptance is green.
- [ ] Record the exact release commit SHA and current production migration state.
- [ ] Confirm Replit workspace `HEAD` exactly matches the intended GitHub `main` SHA.
- [ ] Confirm there are no uncommitted application changes in Replit.

## Frontend deployment and environment

RE:Fashioned is a Vite static application. Replit publishes `artifacts/refashioned/dist/public` and rewrites SPA routes to `/index.html`. The production build requires these public variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The Supabase service-role key must **never** be exposed to the Vite/frontend build. Do not store credentials in this runbook.

A repository-wide audit found no frontend runtime call to `/api`: product data access is through the Supabase client. The generated API client and API artifact expose only `/api/healthz`. The API artifact is retained for now to avoid changing Replit infrastructure and can be assessed separately as legacy cleanup; the frontend deployment remains independently operable as a static Supabase-backed application.

## Database releases

- `supabase/migrations` is the authoritative schema history.
- Apply production schema changes explicitly, deliberately, and as a controlled release operation.
- Replit merge, synchronization, build, and deployment hooks must not mutate the database.
- Drizzle push is not a production migration mechanism. Do not replace it with an automatic `supabase db push`.

## Hosted Supabase verification

Manually confirm in the actual production project; this checklist does not assert or alter hosted configuration:

- [ ] Production Site URL and the exact permitted Redirect URLs are correct.
- [ ] Email confirmation behavior, production SMTP provider, and OTP expiry are appropriate.
- [ ] Abuse protection/CAPTCHA is enabled where appropriate.
- [ ] SSL enforcement and feasible network restrictions are configured.
- [ ] Administrative project accounts use MFA.
- [ ] Supabase Security Advisor findings have been reviewed.
- [ ] Storage bucket visibility and private-access policies are appropriate.
- [ ] Hosted backup status has been verified.

## Backup and recovery verification

Do not claim recoverability until an operator verifies it in the hosted project:

- [ ] Record the current Supabase plan.
- [ ] Verify automatic database backup status, retention, and latest successful backup.
- [ ] Confirm and rehearse the applicable restore procedure.
- [ ] Record whether point-in-time recovery (PITR) is enabled and whether it is required.
- [ ] Maintain and verify a separate recovery plan for Supabase Storage object bytes.

Database backups and Storage object recovery are separate concerns; a database backup does not establish that uploaded object bytes can be recovered.

## Post-deployment

- [ ] Verify the deployment URL and review Replit deployment logs.
- [ ] Run `pnpm test:live-smoke` with only the dedicated smoke account variables.
- [ ] Verify login and the dashboard, products, lifecycle traceability, supplier admin, CSRD readiness, settings, and audit screens.
- [ ] If an appropriate permanent fixture is established, verify one known public DPP URL without modifying it.

Replit logs remain the current deployment-log source. Failed live smoke runs retain Playwright traces, screenshots, video, and HTML diagnostics in GitHub Actions. The frontend ErrorBoundary remains the safe UI failure boundary. Third-party error tracking is a follow-up production enhancement; no external alerting is claimed here.

## Rollback

### Application rollback

Re-publish a previously known-good application release, snapshot, or commit, and record the deployed SHA.

### Database rollback

Do not blindly reverse SQL migrations. Prefer a reviewed forward corrective migration. Database restore is a disaster-recovery action and must follow the verified Supabase backup/restore process. Record both the release SHA and migration state before every deployment.
