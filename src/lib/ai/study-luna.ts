import { createHash, createHmac, randomUUID } from "node:crypto";

export type LunaStudyInput = {
  messages: { role: "user" | "assistant"; content: string }[];
  courseName: string | null;
  courseContext: string | null;
};
export type LunaOptions = {
  baseUrl?: string;
  appSecret?: string;
  fetcher?: typeof fetch;
  now?: () => number;
  uuid?: () => string;
};

export class LunaError extends Error {
  constructor(readonly code: "CONFIG" | "BUDGET" | "RATE" | "UPSTREAM") {
    super(code === "CONFIG" ? "GPT-6 Luna is not configured for StudyOS." :
      code === "BUDGET" ? "The AI spending limit has been reached." :
      code === "RATE" ? "The AI service is busy. Try again later." :
      "GPT-6 Luna could not answer. Please retry.");
    this.name = "LunaError";
  }
}

// Exact v1 signing protocol from thiepn/ai's @thiepn/ai SDK.
// The SDK is not published to npm; keep this limited server-side bridge
// until the official SDK is distributable. Never import it into a client component.
function stableJson(value: unknown): string {
  function canonicalize(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(canonicalize);
    if (v !== null && typeof v === "object") {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]));
    }
    return v;
  }
  return JSON.stringify(canonicalize(value));
}

export async function askStudyLuna(input: LunaStudyInput, options: LunaOptions): Promise<string> {
  if (!options.baseUrl || !options.appSecret || options.appSecret.length < 32) throw new LunaError("CONFIG");
  let origin: URL;
  try {
    origin = new URL(options.baseUrl);
    if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") throw new Error("Invalid base URL");
    if (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname))) throw new Error("HTTPS required");
  } catch {
    throw new LunaError("CONFIG");
  }

  const requestId = (options.uuid ?? randomUUID)();
  const nonce = (options.uuid ?? randomUUID)();
  const timestamp = String(Math.floor((options.now ?? Date.now)() / 1000));
  const body = { capability: "study.explain", input, requestId };
  const digest = createHash("sha256").update(stableJson(body), "utf8").digest("hex");
  const canonical = ["v1", "studyos", timestamp, nonce, "POST", "/v1/run", digest].join("\n");
  const signature = "v1=" + createHmac("sha256", options.appSecret).update(canonical, "utf8").digest("hex");

  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(new URL("/v1/run", origin).toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-thiepn-app": "studyos",
        "x-thiepn-timestamp": timestamp,
        "x-thiepn-nonce": nonce,
        "x-thiepn-signature": signature
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000)
    });
  } catch {
    throw new LunaError("UPSTREAM");
  }

  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new LunaError("UPSTREAM"); }

  if (!response.ok) {
    const code = (payload as {error?: {code?: unknown}} | null)?.error?.code;
    if (code === "BUDGET_EXCEEDED") throw new LunaError("BUDGET");
    if (code === "RATE_LIMITED") throw new LunaError("RATE");
    throw new LunaError("UPSTREAM");
  }

  const envelope = payload as {ok?: unknown; data?: {answer?: unknown}; meta?: {capability?: unknown; requestId?: unknown; model?: unknown; version?: unknown}} | null;
  if (!envelope || envelope.ok !== true ||
    envelope.meta?.capability !== "study.explain" ||
    envelope.meta?.requestId !== requestId ||
    envelope.meta?.model !== "gpt-6-luna" ||
    envelope.meta?.version !== 1 ||
    typeof envelope.data?.answer !== "string" ||
    !envelope.data.answer.trim() ||
    envelope.data.answer.length > 6_000) {
    throw new LunaError("UPSTREAM");
  }
  return envelope.data.answer.trim();
}
