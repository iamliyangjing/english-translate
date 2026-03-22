import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let cached:
  | SupabaseClient<Database>
  | null = null;

export const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient<Database>(url, key, {
      auth: { persistSession: false },
    });
  }
  return cached;
};
