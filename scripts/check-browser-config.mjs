import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";

// Match Next's local configuration loading; CI environment values retain priority.
nextEnv.loadEnvConfig(process.cwd());

// The Next.js server build alone does not prove browser env inlining.
// Only inspect built static JavaScript. Never print credential values.
const root = ".next/static";
assert.ok(existsSync(root), "Next.js static client build is missing.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key, "Both NEXT_PUBLIC Supabase variables are required in CI.");
let hasUrl = false, hasKey = false, count = 0;
function inspect(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { inspect(path); continue; }
    if (!entry.isFile() || !path.endsWith(".js")) continue;
    count++;
    const js = readFileSync(path, "utf8");
    hasUrl ||= js.includes(url);
    hasKey ||= js.includes(key);
  }
}
inspect(root);
assert.ok(count > 0, "No browser JavaScript chunks generated.");
assert.ok(hasUrl, "NEXT_PUBLIC_SUPABASE_URL not embedded in browser JavaScript.");
assert.ok(hasKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not embedded in browser JavaScript.");
console.log("PASS: public Supabase URL/key embedded into production browser JavaScript.");
