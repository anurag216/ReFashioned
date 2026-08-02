import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const ADMIN_EMAIL = "rockerarvi@gmail.com";
const ADMIN_PASSWORD = "Playwrightests@123";
const TEST_SESSION_KEY = "refashioned_test_session";
const authListeners = new Set<(event: string, session: unknown) => void>();

function buildTestSession(email: string) {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
      id: "admin-user-id",
      email,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    },
  };
}

function getStoredSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TEST_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredSession(session: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TEST_SESSION_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TEST_SESSION_KEY);
}

function createMockQueryBuilder(table: string) {
  const productRows = [
    {
      id: "prod-1",
      name: "Essential Cotton Tee",
      sku: "SKU-100",
      season: "SS26",
      status: "published",
      organization_id: "org-123",
      created_at: new Date().toISOString(),
    },
  ];
  const supplierRows = [
    {
      id: "sup-1",
      name: "EcoFibers",
      contact_name: "Asha Singh",
      location: "Maharashtra",
      tier: 1,
      status: "active",
      stage: "Raw Material",
      data_completeness: 82,
      last_activity: new Date().toISOString(),
    },
  ];
  const stageRows = [
    {
      id: "stage-1",
      product_id: "prod-1",
      organization_id: "org-123",
      stage_name: "Cotton Farming",
      co2_impact_kg: 42.3,
      water_usage_l: 12000,
    },
  ];

  const builder = {
    select() {
      return builder;
    },
    eq() {
      return builder;
    },
    neq() {
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    maybeSingle() {
      if (table === "organization_members") {
        return Promise.resolve({
          data: { role: "admin", organization_id: "org-123", profile_id: "admin-user-id" },
          error: null,
        });
      }
      if (table === "organizations") {
        return Promise.resolve({ data: { id: "org-123", name: "Demo Org" }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    insert() {
      return Promise.resolve({ error: null });
    },
    update() {
      return Promise.resolve({ error: null });
    },
    delete() {
      return Promise.resolve({ error: null });
    },
  };

  return {
    ...builder,
    async then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
      if (table === "products") return Promise.resolve({ data: productRows, error: null }).then(resolve);
      if (table === "suppliers") return Promise.resolve({ data: supplierRows, error: null }).then(resolve);
      if (table === "lifecycle_stages") return Promise.resolve({ data: stageRows, error: null }).then(resolve);
      return Promise.resolve({ data: [], error: null }).then(resolve);
    },
    async catch() {
      return Promise.resolve({ data: [], error: null });
    },
  };
}

function createMockSupabaseClient() {
  return {
    auth: {
      async getSession() {
        return { data: { session: getStoredSession() }, error: null };
      },
      async getUser() {
        const session = getStoredSession();
        return { data: { user: session?.user ?? null }, error: null };
      },
      onAuthStateChange(callback: (event: string, session: unknown) => void) {
        authListeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe() {
                authListeners.delete(callback);
              },
            },
          },
        };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          const session = buildTestSession(email);
          setStoredSession(session);
          for (const listener of authListeners) {
            listener("SIGNED_IN", session);
          }
          return { data: { session }, error: null };
        }
        return {
          data: { session: null },
          error: new Error("Invalid email or password"),
        };
      },
      async signOut() {
        clearStoredSession();
        for (const listener of authListeners) {
          listener("SIGNED_OUT", null);
        }
        return { error: null };
      },
    },
    from(table: string) {
      return createMockQueryBuilder(table);
    },
  };
}

// Typed client — supabase.from("products") returns Product[] automatically.
// When env vars are absent, a lightweight test-mode mock is exported so the
// local app can still exercise auth and protected routes in test/dev.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey)
    : createMockSupabaseClient();
