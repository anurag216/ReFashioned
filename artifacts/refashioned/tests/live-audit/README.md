# Re:Fashioned live pilot audit

This suite exercises the deployed Re:Fashioned application through Playwright and is intentionally separate from the deterministic local pgTAP/Playwright security gate.

## Modes

- **Safe mode** (default/scheduled): authentication, navigation, route inventory, search/filter, truthfulness, public-boundary, responsive and practical accessibility checks. Mutating synthetic-data tests are skipped.
- **Full synthetic mode** (`workflow_dispatch` with `allow_destructive=true`): additionally imports run-scoped synthetic Products, Suppliers, Product Materials and Lifecycle Stages and exercises product/supplier creation. Use only with the disposable QA tenant.

Every full-mode import rewrites product SKUs and supplier references with `QA_RUN_KEY`, so repeated workflow runs do not collide with previous test runs.

## Required GitHub Actions secrets

- `PLAYWRIGHT_ADMIN_EMAIL`
- `PLAYWRIGHT_ADMIN_PASSWORD`

The workflow target defaults to `https://re-fashioned--anuragncu.replit.app` and can be overridden at dispatch time.

## Artifacts

Each run uploads:

- `QA_REPORT.md`
- `summary.json`
- Playwright HTML report
- failure screenshots/videos/traces
- per-route control inventory JSON
- practical accessibility findings attached to test cases

Role/tenant authorization remains covered by the existing local E2E + pgTAP CI suites. Add live Manager/Viewer/Supplier accounts later if you want production-like live role coverage too.
