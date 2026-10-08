import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("browser config uses literal NEXT_PUBLIC property access", () => {
  const config = read("../src/lib/supabase/browser-config.ts");
  assert.match(config, /process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(config, /process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(config, /process\.env\s*\[/);
  assert.doesNotMatch(config, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});
test("browser client stays isolated from server env module", () => {
  const client = read("../src/lib/supabase/client.ts");
  assert.match(client, /getBrowserSupabaseConfig/);
  assert.doesNotMatch(client, /from\s+["']@\/lib\/env["']/);
  assert.doesNotMatch(client, /process\.env\s*\[/);
});
test("server public config also uses literal property accesses", () => {
  const env = read("../src/lib/env.ts");
  assert.match(env, /process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(env, /process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});
