# RE:Fashioned

A sustainability intelligence platform for fashion brands — lifecycle traceability, CSRD compliance reporting, carbon footprint modelling, supplier management, and Digital Product Passports.

## Run & Operate

- `pnpm --filter @workspace/refashioned run dev` — run the React/Vite front-end (via workflow)
- `pnpm --filter @workspace/refashioned run typecheck` — typecheck the front-end
- `pnpm run typecheck` — full typecheck across all workspace packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000, via workflow)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string; `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — Supabase project

## Stack

- **Monorepo:** pnpm workspaces, Node.js 24, TypeScript 5.9
- **Front-end:** React 18 + Vite, Tailwind CSS v4, `wouter` v3 routing, `React.lazy` + `Suspense` code-splitting
- **Auth & DB (current):** Supabase (external) — `@supabase/supabase-js`, client at `artifacts/refashioned/src/lib/supabaseClient.ts`
- **Charts:** Recharts
- **Icons:** Lucide React
- **API:** Express 5
- **DB (planned):** PostgreSQL + Drizzle ORM, Zod (`zod/v4`), `drizzle-zod`
- **API codegen:** Orval (from OpenAPI spec)
- **Build:** esbuild (CJS bundle)

## Where things live

```
artifacts/refashioned/src/
  App.tsx                   ← Auth gate + router shell ONLY (~160 lines)
  lib/supabaseClient.ts     ← Supabase client (null-safe; null when env vars missing)
  LoginScreen.tsx           ← Auth UI with Remember Me
  pages/
    Dashboard.tsx
    Traceability.tsx
    SupplierPortal.tsx
    DigitalProductPassport.tsx
    BrandProfile.tsx
    Settings.tsx
    CSRDReport.tsx
    CarbonCalculator.tsx
    RegulatoryRadar.tsx
    NotFound.tsx            ← 404 catch-all
```

## URL routing map

All routes are protected by the Supabase auth gate in `App.tsx`. Unauthenticated users always see `LoginScreen` regardless of path.

| Path | Component | Notes |
|---|---|---|
| `/` | — | Redirects to `/dashboard` |
| `/dashboard` | `Dashboard` | — |
| `/traceability` | `Traceability` | — |
| `/suppliers` | `SupplierPortal` | — |
| `/passport` | `DigitalProductPassport` | **Full-screen, no app shell** (sidebar/header hidden) |
| `/reports/csrd` | `CSRDReport` | — |
| `/calculator` | `CarbonCalculator` | — |
| `/regulatory` | `RegulatoryRadar` | — |
| `/profile` | `BrandProfile` | — |
| `/settings` | `Settings` | — |
| `*` (catch-all) | `NotFound` | Dark-green 404, "Return to Dashboard" button |

## Architecture decisions

- **Pages as named exports.** Every page file exports a named function (e.g. `export function Dashboard`), never a default export. `App.tsx` lazy-imports each as `lazy(() => import("./pages/X").then(m => ({ default: m.X })))`.
- **DPP full-screen pattern.** `/passport` is special-cased with `if (location === "/passport") return <Suspense>…</Suspense>` *before* the shell renders. This gives the Digital Product Passport its own full-page layout with no sidebar or top bar.
- **Single `Suspense` boundary.** One `<Suspense fallback={<DarkSpinner />}>` wraps the entire `<Switch>` in the shell, plus a separate `<Suspense>` wraps the DPP full-screen branch. All pages share the same dark-green spinner fallback.
- **`App.tsx` is routing-only.** Auth gate → DPP check → shell layout → `<Switch>`. No business logic, no large icon lists, no Recharts. Kept at ~160 lines.
- **Supabase client is null-safe.** `supabaseClient.ts` exports `null` when env vars are absent (dev without `.env`). All callers must guard with `if (!supabase)`.

## Product

RE:Fashioned gives fashion brands a single platform to: track product lifecycle traceability and supplier compliance; generate EU CSRD / ESRS disclosure reports; model carbon footprint against SBTi targets; manage supplier portals; issue EU Digital Product Passports (DPP); and publish a public-facing brand sustainability profile.

## User preferences

- Surgical edits only — never rewrite whole files that aren't being fully replaced.
- Do NOT touch auth logic, sidebar structure, or routing shell in `App.tsx` unless explicitly asked.
- Phase-based refactors: extract components to `src/pages/` as named exports, typecheck after each phase, restart workflow, screenshot to verify.
- Dark-green brand palette: primary `hsl(152 53% 8%)`, accent green `#6AE096`.

## Gotchas

- **Wouter `<Link>` renders as `<a>` directly** — do not nest an `<a>` inside `<Link>` or you get invalid HTML.
- **Named export lazy pattern:** `lazy(() => import("./pages/X").then(m => ({ default: m.X })))` — required because pages use named (not default) exports.
- **DPP route must be checked before the shell renders** — it lives in an `if (location === "/passport")` branch above the `return <div className="flex h-screen…">` shell.
- **Supabase is null when env vars are missing** — always guard: `if (!supabase) { … return; }`.
- **Do not run `pnpm dev` at workspace root** — apps run via Replit workflows with `PORT` and `BASE_PATH` env vars.
- **Typecheck before restart:** always run `pnpm --filter @workspace/refashioned run typecheck` after edits, then restart the workflow.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- Supabase schema (next priority): tenant model, `brands`, `products`, `lifecycle_stages`, `suppliers`, `certifications` tables.
