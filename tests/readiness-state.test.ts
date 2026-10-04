import test from "node:test";
import assert from "node:assert/strict";
import { evaluateReadiness } from "../src/lib/study/readiness-state.ts";

const server = {
  deploymentEnv: "production",
  appOrigin: "https://study.example.com",
  secureOrigin: true,
  hasSupabaseSecret: true,
  hasGoogleDriveClientId: true,
  hasGoogleDriveClientSecret: true,
  hasDriveTokenKey: true,
  googleDriveConfigured: true,
  buildSha: "abc",
};

const backend = {
  workspace_initialized: true,
  courses_ready: true,
  drive_connected: true,
  drive_tree_ready: true,
  first_material_ready: false,
};

test("infrastructure can be ready before first lecture material exists", () => {
  const result = evaluateReadiness(server, backend);
  assert.equal(result.infrastructureReady, true);
  assert.equal(result.firstWeekOperational, false);
  assert.deepEqual(result.blockers, []);
});

test("missing Drive account blocks infrastructure readiness", () => {
  const result = evaluateReadiness(server, { ...backend, drive_connected: false, drive_tree_ready: false });
  assert.equal(result.infrastructureReady, false);
  assert.match(result.blockers.join(" "), /Google Drive account/i);
});
