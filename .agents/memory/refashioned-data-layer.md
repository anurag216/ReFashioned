---
name: RE:Fashioned data layer
description: TypeScript interfaces for the 6 core Supabase tables, the Database generic, the typed client, and rules for adding new tables.
---

## Source-of-truth file

`artifacts/refashioned/src/lib/types.ts` — all Row interfaces, Insert/Update helpers, Database generic, and TypedSupabaseClient alias.

`artifacts/refashioned/src/lib/supabaseClient.ts` — exports `supabase: SupabaseClient<Database> | null`.

## Table → interface mapping

| Supabase table | TypeScript Row interface | Notes |
|---|---|---|
| `organizations` | `Organization` | Tenant root. `slug` is URL-safe unique identifier. |
| `profiles` | `Profile` | `id` = `auth.users.id`. `role`: admin / manager / viewer. |
| `products` | `Product` | `material_composition` is `Record<string, number>` JSON (pct per material). |
| `suppliers` | `Supplier` | `tier: 1 | 2 | 3`. `data_completeness` 0–100. `certifications` is `string[]`. |
| `lifecycle_stages` | `LifecycleStage` | `co2_impact_kg`, `water_usage_l` already queried by Dashboard + CSRDReport. |
| `digital_product_passports` | `DigitalProductPassport` | `circularity_score` 0–100. `status`: draft / published / archived. |

## Insert / Update pattern

Every table has:
- `XxxInsert` = `Omit<Xxx, "id" | "created_at" | "updated_at">` — use for `.insert()` calls
- `XxxUpdate` = `Partial<XxxInsert>` — use for `.update()` calls
- Exception: `ProfileInsert` does NOT omit `id` (auth.users.id must be supplied)

## CRITICAL: Relationships must be `any[]`, not `[]`

`@supabase/postgrest-js` v2.106+ requires every table entry in `Database["public"]["Tables"]` to have `Relationships: GenericRelationship[]`. Using `[]` (empty tuple) does NOT satisfy the `GenericTable` constraint — TypeScript resolves `from("table")` as `never`, causing `insert()` to expect `never[]` and query data to be `never`. Use `Relationships: any[]` to satisfy the constraint.

**Why:** `any[]` satisfies `GenericRelationship[]` because `any` is the universal type. `[]` (empty tuple) fails the constraint check at the generic level in TS 5.9 + postgrest-js 2.106.

## Adding a new table

1. Add a `Row` interface to `types.ts`
2. Add `XxxInsert` and `XxxUpdate` helper types
3. Add the entry to `Database["public"]["Tables"]` with `Relationships: any[]`
4. No changes needed to `supabaseClient.ts` — the generic picks it up automatically

## Typed client usage

```ts
import { supabase } from "../lib/supabaseClient";

// Always null-guard first
if (!supabase) return;

// Fully typed — data is Product[]
const { data, error } = await supabase
  .from("products")
  .select("*")
  .eq("organization_id", orgId);
```

Partial selects narrow the type automatically:
```ts
// data is Pick<LifecycleStage, "co2_impact_kg" | "water_usage_l">[]
const { data } = await supabase
  .from("lifecycle_stages")
  .select("co2_impact_kg, water_usage_l");
```
The explicit `as` casts in `CSRDReport.tsx` and `Dashboard.tsx` predate the typed client — they are now redundant but harmless. Remove them when touching those files.

## Enums in Database type

Defined under `Database["public"]["Enums"]` for reference:
`product_status`, `supplier_status`, `dpp_status`, `compliance_status`, `user_role`, `org_plan`
