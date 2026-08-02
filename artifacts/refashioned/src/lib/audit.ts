/**
 * Audit Trail helper
 * Fire-and-forget — never awaited, never blocks UI.
 * Inserts a row into `audit_logs` scoped to the current user's organisation.
 */
import { supabase } from "./supabaseClient";

export type AuditAction =
  | "archived"
  | "stage_added"
  | "passport_published"
  | "passport_unpublished"
  | "product_created"
  | "supplier_invited";

export type AuditEntityType =
  | "product"
  | "lifecycle_stage"
  | "supplier"
  | string;

interface AuditPayload {
  action: AuditAction | string;
  entity_type: AuditEntityType;
  entity_name: string;
}

/**
 * Silently log an audit event. Call with `void logAudit(...)` — the
 * returned promise is intentionally ignored so it never blocks the UI.
 */
export async function logAudit(payload: AuditPayload): Promise<void> {
  if (!supabase) return;
  const client = supabase;
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (client
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle() as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgId: string | null = (member as any)?.organization_id ?? null;
    if (!orgId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ((client.from("audit_logs") as any).insert({
      organization_id: orgId,
      profile_id:      user.id,
      action:          payload.action,
      entity_type:     payload.entity_type,
      entity_name:     payload.entity_name,
    }));
  } catch {
    // Audit logging must never surface errors to the user
  }
}
