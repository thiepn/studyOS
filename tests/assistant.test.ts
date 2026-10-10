import test from "node:test";
import assert from "node:assert/strict";
import { handleAssistantRequest, parseAssistantInput } from "../src/lib/study/assistant.ts";

const owner = "owner-assistant-test";
const question = { messages: [{ role: "user", content: "Explain this idea" }] };

test("assistant input bounds conversation and requires a final user turn", () => {
  assert.throws(() => parseAssistantInput({ messages: Array.from({ length: 9 }, () => ({ role: "user", content: "x" })) }));
  assert.throws(() => parseAssistantInput({ messages: [{ role: "assistant", content: "answer" }] }));
  assert.throws(() => parseAssistantInput({ messages: [{ role: "user", content: "x".repeat(4001) }] }));
  assert.equal(parseAssistantInput(question).messages.length, 1);
});

test("assistant rejects unauthenticated requests before calling provider", async () => {
  let providerCalled = false;
  const result = await handleAssistantRequest(question, {
    getOwner: async () => null,
    getCourseContext: async () => null,
    apiKey: "mock-key",
    fetcher: async () => { providerCalled = true; return new Response(); },
  });
  assert.equal(result.status, 401);
  assert.equal(providerCalled, false);
});

test("assistant reports missing configuration without provider call", async () => {
  let providerCalled = false;
  const result = await handleAssistantRequest(question, {
    getOwner: async () => owner,
    getCourseContext: async () => null,
    enabled: true,
    fetcher: async () => { providerCalled = true; return new Response(); },
  });
  assert.equal(result.status, 503);
  assert.equal(providerCalled, false);
});

test("assistant stays disabled until a spending budget is approved", async () => {
  let providerCalled = false;
  const result = await handleAssistantRequest(question, {
    getOwner: async () => owner,
    getCourseContext: async () => null,
    apiKey: "mock-key",
    enabled: false,
    fetcher: async () => { providerCalled = true; return new Response(); },
  });
  assert.equal(result.status, 503);
  assert.equal(providerCalled, false);
});

test("assistant refuses a course that is unavailable to the authenticated owner", async () => {
  const result = await handleAssistantRequest({ courseId: "123e4567-e89b-42d3-a456-426614174000", ...question }, {
    getOwner: async () => owner,
    getCourseContext: async (resolvedOwner) => { assert.equal(resolvedOwner, owner); return null; },
    apiKey: "mock-key",
    enabled: true,
    fetcher: async () => { throw new Error("provider must not be called"); },
  });
  assert.equal(result.status, 404);
});

test("assistant calls the configured Luna model with bounded output and returns source metadata", async () => {
  let captured: Record<string, unknown> | undefined;
  const result = await handleAssistantRequest({ courseId: "123e4567-e89b-42d3-a456-426614174000", ...question }, {
    getOwner: async () => owner,
    getCourseContext: async () => ({ courseName: "Analysis", context: "Skill: limits\nVerified source title: Verified lecture", sources: [{ title: "Verified lecture", url: "https://drive.google.com/file/d/abc" }] }),
    apiKey: "mock-key",
    model: "gpt-6-luna-test",
    enabled: true,
    now: () => 1_000_000,
    fetcher: async (_url, init) => {
      captured = JSON.parse(String(init?.body));
      return Response.json({ choices: [{ message: { content: "A limit describes the value approached." } }] });
    },
  });
  assert.equal(result.status, 200);
  assert.equal((result.body as any).answer, "A limit describes the value approached.");
  assert.equal((result.body as any).context.sources[0].title, "Verified lecture");
  assert.equal(captured?.model, "gpt-6-luna-test");
  assert.equal(captured?.max_completion_tokens, 700);
  assert.equal(captured?.reasoning_effort, "none");
  assert.equal(JSON.stringify(captured).includes("Verified lecture"), true);
});

test("assistant turns provider failure into a retryable error without leaking provider details", async () => {
  const result = await handleAssistantRequest(question, {
    getOwner: async () => owner,
    getCourseContext: async () => null,
    apiKey: "mock-key",
    enabled: true,
    now: () => 2_000_000,
    fetcher: async () => new Response(JSON.stringify({ error: "private upstream detail" }), { status: 500 }),
  });
  assert.equal(result.status, 502);
  assert.match(String((result.body as any).error), /could not answer/i);
  assert.equal(JSON.stringify(result.body).includes("private upstream detail"), false);
});
