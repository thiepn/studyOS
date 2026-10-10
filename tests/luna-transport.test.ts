import test from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { askStudyLuna, LunaError } from "../src/lib/ai/study-luna.ts";

const secret = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const input = { messages: [{ role: "user" as const, content: "Explain determinants" }], courseName: null, courseContext: null };

test("Luna bridge signs the exact shared v1 request protocol", async () => {
  let captured!: { url: string; init: RequestInit };
  const answer = await askStudyLuna(input, {
    baseUrl: "https://ai.example.test", appSecret: secret,
    now: () => 1_700_000_000_000, uuid: (() => { let n = 0; return () => ++n === 1 ? "request-1" : "nonce-2"; })(),
    fetcher: async (url, init) => {
      captured = { url: String(url), init: init ?? {} };
      return Response.json({ ok: true, data: { answer: "A determinant is a scalar." }, meta: { capability: "study.explain", requestId: "request-1", model: "gpt-6-luna", version: 1 } });
    }
  });
  assert.equal(answer, "A determinant is a scalar.");
  assert.equal(captured.url, "https://ai.example.test/v1/run");
  assert.equal(captured.init.method, "POST");
  const body = JSON.parse(String(captured.init.body));
  assert.deepEqual(body, { capability: "study.explain", input, requestId: "request-1" });
  // Independently assemble the sorted JSON used by the official AI client.
  const sorted = JSON.stringify({ capability: "study.explain", input: { courseContext: null, courseName: null, messages: [{content:"Explain determinants", role:"user"}] }, requestId: "request-1" });
  const digest = createHash("sha256").update(sorted).digest("hex");
  const payload = ["v1", "studyos", "1700000000", "nonce-2", "POST", "/v1/run", digest].join("\n");
  const signature = "v1=" + createHmac("sha256", secret).update(payload).digest("hex");
  const headers = new Headers(captured.init.headers);
  assert.equal(headers.get("x-thiepn-signature"), signature);
  assert.equal(headers.get("x-thiepn-app"), "studyos");
});

test("Luna bridge fails closed without secret, invalid endpoint, or valid response", async () => {
  let called = false;
  const fetcher = async () => { called = true; return Response.json({ ok: true, data: { answer: "unsafe" } }); };
  await assert.rejects(askStudyLuna(input, { baseUrl: "https://ai.example.test", fetcher }), (e: unknown) => e instanceof LunaError && e.code === "CONFIG");
  await assert.rejects(askStudyLuna(input, { baseUrl: "http://other.example.test", appSecret: secret, fetcher }), (e: unknown) => e instanceof LunaError && e.code === "CONFIG");
  assert.equal(called, false);
  await assert.rejects(askStudyLuna(input, { baseUrl: "https://ai.example.test", appSecret: secret, fetcher }), (e: unknown) => e instanceof LunaError && e.code === "UPSTREAM");
});

test("Luna budget exhaustion surfaces a safe code", async () => {
  await assert.rejects(askStudyLuna(input, { baseUrl: "https://ai.example.test", appSecret: secret,
    fetcher: async () => Response.json({ ok: false, error: { code: "BUDGET_EXCEEDED", message: "internal data" } }, { status: 429 })
  }), (e: unknown) => e instanceof LunaError && e.code === "BUDGET");
});
