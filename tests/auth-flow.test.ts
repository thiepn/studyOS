import test from "node:test";
import assert from "node:assert/strict";
import {
  safeAuthFailure, providerAuthFailure, authLoginUrl,
  authenticatedReturnUrl, validAuthSubmission,
} from "../src/lib/study/auth-flow.ts";

test("known auth errors are mapped; arbitrary provider text is never surfaced", () => {
  assert.equal(safeAuthFailure("oauth_origin"), "oauth_origin");
  assert.equal(safeAuthFailure("session_missing"), "session_missing");
  assert.equal(safeAuthFailure("oops <img src=x>"), null);
  assert.equal(providerAuthFailure("access_denied"), "provider_denied");
  assert.equal(providerAuthFailure("server_error"), "provider_error");
});
test("a login error retains safe destinations without leaking provider or cookie data", () => {
  const url = authLoginUrl("https://study.thiepn.dev", "oauth_callback", "/courses/abc?week=4");
  assert.equal(url.origin, "https://study.thiepn.dev");
  assert.equal(url.pathname, "/login");
  assert.equal(url.searchParams.get("next"), "/courses/abc?week=4");
  assert.equal(url.searchParams.get("error"), "oauth_callback");
  assert.equal(authLoginUrl("https://study.thiepn.dev", "missing_code", "//evil.example").searchParams.has("next"), false);
});
test("an existing session returns to the intended destination instead of Today", () => {
  assert.equal(authenticatedReturnUrl("https://study.thiepn.dev", "/practice?mode=week").href,
    "https://study.thiepn.dev/practice?mode=week");
  assert.equal(authenticatedReturnUrl("https://study.thiepn.dev", "/\\evil.example").href,
    "https://study.thiepn.dev/");
});
test("sign-out must originate from the exact trusted application host", () => {
  assert.equal(validAuthSubmission("https://study.thiepn.dev", "https://study.thiepn.dev", "https://study.thiepn.dev"), true);
  for (const origin of [null,"https://attacker.example","https://study.thiepn.dev.attacker.example"]) {
    assert.equal(validAuthSubmission("https://study.thiepn.dev", "https://study.thiepn.dev", origin), false);
  }
  assert.equal(validAuthSubmission("https://study.thiepn.dev", "https://other.example", "https://study.thiepn.dev"), false);
});
