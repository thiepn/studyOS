import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("every deployed build must verify compiled Supabase browser configuration", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));
  assert.match(pkg.scripts.build, /next build\s*&&\s*node scripts\/check-browser-config\.mjs/);
  const ci = readFileSync(new URL("../.github/workflows/ci.yml",import.meta.url),"utf8");
  assert.match(ci, /node scripts\/check-browser-config\.mjs/);
});
