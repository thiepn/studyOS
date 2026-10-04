import { createClient } from "@supabase/supabase-js";
import { env, requireServiceRoleEnv } from "@/lib/env";
import type { Database } from "./database.types";

export function createAdminClient() {
  const { serviceRoleKey } = requireServiceRoleEnv();
  return createClient<Database>(env.supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
