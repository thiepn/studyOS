import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DRIVE_FILE_SCOPE, hasGrantedDriveFileScope } from "../src/lib/google-drive/scope-validation.ts";

test("Google granular consent: identity-only scopes do not enable Drive", () => {
  assert.equal(hasGrantedDriveFileScope("openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"), false);
  assert.equal(hasGrantedDriveFileScope(""), false);
  assert.equal(hasGrantedDriveFileScope(null), false);
});
test("Drive file scope is mandatory and accepted with identity grants", () => {
  assert.equal(hasGrantedDriveFileScope("openid " + DRIVE_FILE_SCOPE), true);
  assert.equal(hasGrantedDriveFileScope(["openid", DRIVE_FILE_SCOPE]), true);
  assert.equal(hasGrantedDriveFileScope("https://www.googleapis.com/auth/drive.readonly openid"), false);
});
test("callback checks Drive permission before saving a connection or creating folders", () => {
  const callback=readFileSync(new URL("../src/app/api/integrations/google-drive/callback/route.ts",import.meta.url),"utf8");
  assert.ok(callback.indexOf("hasGrantedDriveFileScope(tokens.scope)") < callback.indexOf("await saveDriveConnection("));
  assert.ok(callback.indexOf("hasGrantedDriveFileScope(tokens.scope)") < callback.indexOf("await createSemesterDriveTree("));
  assert.match(callback,/return finish\("permission_required"\)/);
  assert.match(callback,/return finish\("setup_failed"\)/);
});
