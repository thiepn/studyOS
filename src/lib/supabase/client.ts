import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!browserClient) browserClient = createBrowserClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
  return browserClient;
}
