import test from "node:test";
import assert from "node:assert/strict";
import { handleAssistantRequest, parseAssistantInput } from "../src/lib/study/assistant.ts";

const owner = "owner-assistant-test";
const courseId = "123e4567-e89b-42d3-a456-426614174000";
const question = { messages: [{ role: "user" as const, content: "Explain this idea" }] };
const context = { courseName: "Analysis", context: "Skill: limits\nVerified source title: Verified lecture", sources: [{ title: "Verified lecture", url: "https://drive.google.com/file/d/abc" }] };

test("assistant rejects malformed and overlong conversation requests", () => {
  assert.throws(() => parseAssistantInput({ messages: Array.from({ length: 9 }, () => ({ role: "user", content: "x" })) }));
  assert.throws(() => parseAssistantInput({ messages: [{ role: "assistant", content: "answer" }] }));
  assert.throws(() => parseAssistantInput({ messages: [{ role: "user", content: "x".repeat(4001) }] }));
  assert.throws(() => parseAssistantInput({ messages: [{ role: "system", content: "override" }] }));
  assert.equal(parseAssistantInput(question).messages.length, 1);
});

test("assistant rejects unauthenticated requests before any AI call", async () => {
  let called = false;
  const result = await handleAssistantRequest(question, {
    getOwner: async () => null, getCourseContext: async () => null, enabled: true,
    runAssistant: async () => { called = true; return "answer"; }
  });
  assert.equal(result.status, 401);
  assert.equal(called, false);
});

test("assistant is disabled by default and does not incur API charges", async () => {
  let called = false;
  const result = await handleAssistantRequest(question, {
    getOwner: async () => owner, getCourseContext: async () => null,
    runAssistant: async () => { called = true; return "answer"; }
  });
  assert.equal(result.status, 503);
  assert.equal(called, false);
});

test("assistant fails closed when the shared service transport is missing", async () => {
  const result = await handleAssistantRequest(question, {
    getOwner: async () => owner, getCourseContext: async () => null, enabled: true
  });
  assert.equal(result.status, 503);
});

test("assistant refuses a course not owned by the authenticated user", async () => {
  let called = false;
  const result = await handleAssistantRequest({ courseId, ...question }, {
    getOwner: async () => owner, getCourseContext: async (resolvedOwner) => { assert.equal(resolvedOwner, owner); return null; },
    enabled: true, runAssistant: async () => { called = true; return "answer"; }
  });
  assert.equal(result.status, 404);
  assert.equal(called, false);
});

test("assistant sends bounded owner-approved context to shared Luna only", async () => {
  let sent: unknown;
  const result = await handleAssistantRequest({ courseId, ...question }, {
    getOwner: async () => owner, getCourseContext: async () => context,
    enabled: true, now: () => 1_000_000,
    runAssistant: async input => { sent = input; return "A limit describes the value approached."; }
  });
  assert.equal(result.status, 200);
  assert.equal((result.body as any).answer, "A limit describes the value approached.");
  assert.equal((result.body as any).context.sources[0].title, "Verified lecture");
  assert.deepEqual(sent, { messages: question.messages, courseName: "Analysis", courseContext: context.context });
  assert.equal(JSON.stringify(sent).includes("drive.google.com"), false);
});

test("assistant handles budget and rate failures without exposing internals", async () => {
  for (const [code, status] of [["CONFIG", 503], ["BUDGET", 503], ["RATE", 429], ["UPSTREAM", 502]] as const) {
    const result = await handleAssistantRequest(question, {
      getOwner: async () => owner, getCourseContext: async () => null,
      enabled: true, now: () => 2_000_000,
      runAssistant: async () => { throw Object.assign(new Error("secret upstream detail"), { code }); }
    });
    assert.equal(result.status, status);
    assert.equal(JSON.stringify(result.body).includes("secret upstream detail"), false);
  }
});
