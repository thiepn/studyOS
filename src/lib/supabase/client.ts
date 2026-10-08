import { createBrowserClient } from "@supabase/ssr";
import { getBrowserSupabaseConfig } from "./browser-config";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (!browserClient) {
    const { url, publishableKey } = getBrowserSupabaseConfig();
    browserClient = createBrowserClient<Database>(url, publishableKey);
  }
  return browserClient;
}
