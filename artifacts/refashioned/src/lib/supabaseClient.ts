import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl      = import.meta.env.VITE_SUPABASE_URL      as string | undefined;
const supabaseAnonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Typed client — supabase.from("products") returns Product[] automatically.
// Null when env vars are absent (dev without .env). All callers must guard:
//   if (!supabase) { … return; }
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey)
    : null;
