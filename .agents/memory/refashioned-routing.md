---
name: RE:Fashioned routing conventions
description: URL map, DPP full-screen pattern, React.lazy import pattern, wouter v3 gotchas — everything needed to work on App.tsx without re-reading the whole codebase.
---

## URL map

| Path | Component | Shell? |
|---|---|---|
| `/` | → redirect to `/dashboard` | n/a |
| `/dashboard` | `Dashboard` | yes |
| `/traceability` | `Traceability` | yes |
| `/suppliers` | `SupplierPortal` | yes |
| `/passport` | `DigitalProductPassport` | **NO — full-screen** |
| `/reports/csrd` | `CSRDReport` | yes |
| `/calculator` | `CarbonCalculator` | yes |
| `/regulatory` | `RegulatoryRadar` | yes |
| `/profile` | `BrandProfile` | yes |
| `/settings` | `Settings` (lazy var: `SettingsPage`) | yes |
| `*` catch-all | `NotFound` | yes |

## DPP full-screen pattern

`/passport` must render **outside** the sidebar/header shell. In `App.tsx`, this is handled with an early return **before** the shell `<div>`:

```tsx
const [location, setLocation] = useLocation();
// … auth gate …
if (location === "/passport") {
  return (
    <Suspense fallback={<DarkSpinner fullScreen />}>
      <DigitalProductPassport onBack={() => setLocation("/traceability")} />
    </Suspense>
  );
}
// then the normal shell return follows
```

**Why:** The DPP is a public-style consumer-facing view. It has its own header, hero section, and full-page layout — mixing it into the sidebar shell breaks the design.

**How to apply:** Any future route that needs a full-page layout (e.g. a public brand profile URL, an onboarding wizard) should follow the same early-return pattern.

## Lazy-import pattern (named exports)

All pages use **named exports** (`export function Dashboard { … }`), never default exports. `React.lazy` requires a default export, so use the `.then` transform:

```tsx
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then(m => ({ default: m.Dashboard }))
);
```

One `<Suspense fallback={<DarkSpinner />}>` wraps the entire `<Switch>` in the shell. The DPP branch has its own `<Suspense fallback={<DarkSpinner fullScreen />}>`.

**Why:** Named exports were chosen for pages so they can be imported directly (e.g. for tests or storybook) without relying on default-export conventions. The `.then(m => ({ default: m.X }))` adapter is the minimal bridge.

## Wouter v3 gotchas

- `<Link href="/path">` renders as an `<a>` itself — **never nest an `<a>` inside `<Link>`** (invalid HTML, causes double-navigation).
- `useLocation()` returns `[location, setLocation]` — use `setLocation("/path")` for programmatic navigation.
- `<Route>` with no `path` prop = catch-all (used for the 404 page at the bottom of `<Switch>`).
- Active sidebar state: `location === item.path || (item.path !== "/" && location.startsWith(item.path))`.

## App.tsx structure (keep it this way)

```
imports (lazy pages, icons, supabase, wouter)
DarkSpinner component
navItems constant (path → label → icon)
App():
  state: session, authLoading
  useLocation hook
  useEffect: Supabase auth subscription
  if authLoading → <DarkSpinner fullScreen />
  if !session → <LoginScreen />
  if location === "/passport" → <Suspense><DPP /></Suspense>  ← EARLY RETURN
  return shell (sidebar + header + <Suspense><Switch>…</Switch></Suspense>)
```

`App.tsx` must stay ~160 lines. No business logic, no Recharts, no large icon lists.

## Cross-page navigation props

Pages that need to navigate use callback props passed from App (not direct wouter imports in the page files):

| Prop | Passed to | Value |
|---|---|---|
| `onViewMetrics` | `Dashboard` | `() => setLocation("/traceability")` |
| `onViewDPP` | `Traceability` | `() => setLocation("/passport")` |
| `onBack` | `DigitalProductPassport` | `() => setLocation("/traceability")` |
| `onViewDashboard` | `BrandProfile` | `() => setLocation("/dashboard")` |

**Why:** Keeps pages decoupled from the router — they can be rendered in isolation (tests, canvas mockups) without needing a wouter context.
