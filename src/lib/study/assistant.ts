export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantContext = { courseName: string; context: string; sources: { title: string; url: string | null }[] };
export type AssistantInput = { courseId?: string; messages: AssistantMessage[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 4000;
const MAX_CONTEXT_CHARS = 8000;
const recentRequests = new Map<string, number[]>();

export function parseAssistantInput(value: unknown): AssistantInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid request.");
  const body = value as Record<string, unknown>;
  const courseId = body.courseId == null || body.courseId === "" ? undefined : String(body.courseId);
  if (courseId && !UUID.test(courseId)) throw new Error("Choose a valid course.");
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > MAX_MESSAGES) throw new Error("A conversation can contain up to 8 recent messages.");
  const messages = body.messages.map((item): AssistantMessage => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid conversation message.");
    const row = item as Record<string, unknown>;
    if (row.role !== "user" && row.role !== "assistant") throw new Error("Invalid conversation role.");
    if (typeof row.content !== "string" || !row.content.trim() || row.content.length > MAX_MESSAGE_CHARS) throw new Error("Each message must contain 1 to 4,000 characters.");
    return { role: row.role, content: row.content.trim() };
  });
  if (messages.at(-1)?.role !== "user") throw new Error("Send a question to continue.");
  if (messages.reduce((size, message) => size + message.content.length, 0) > 10000) throw new Error("Conversation is too long. Start a new conversation.");
  return { courseId, messages };
}

function allowRequest(ownerId: string, now: number) {
  const active = (recentRequests.get(ownerId) ?? []).filter((stamp) => now - stamp < 60_000);
  if (active.length >= 8) { recentRequests.set(ownerId, active); return false; }
  active.push(now);
  recentRequests.set(ownerId, active);
  if (recentRequests.size > 2000) for (const [key, stamps] of recentRequests) if (!stamps.some((stamp) => now - stamp < 60_000)) recentRequests.delete(key);
  return true;
}

export type AssistantDependencies = {
  getOwner: () => Promise<string | null>;
  getCourseContext: (ownerId: string, courseId: string) => Promise<AssistantContext | null>;
  runAssistant?: (input: {
    messages: AssistantMessage[];
    courseName: string | null;
    courseContext: string | null;
  }) => Promise<string>;
  enabled?: boolean;
  now?: () => number;
};

export async function handleAssistantRequest(value: unknown, dependencies: AssistantDependencies) {
  const ownerId = await dependencies.getOwner();
  if (!ownerId) return { status: 401, body: { ok: false, error: "Authentication required." } };
  let input: AssistantInput;
  try { input = parseAssistantInput(value); }
  catch (error) { return { status: 400, body: { ok: false, error: error instanceof Error ? error.message : "Invalid request." } }; }
  // Never fall back to direct OpenAI requests; the shared service owns spend and rate limits.
  if (!dependencies.enabled) return { status: 503, body: { ok: false, error: "GPT-6 Luna is paused until an API spending budget is approved." } };
  if (!dependencies.runAssistant) return { status: 503, body: { ok: false, error: "GPT-6 Luna is not configured for StudyOS." } };
  if (!allowRequest(ownerId, (dependencies.now ?? Date.now)())) return { status: 429, body: { ok: false, error: "Study Assistant is busy for this account. Wait a minute and try again." } };

  let context: AssistantContext | null = null;
  if (input.courseId) {
    try { context = await dependencies.getCourseContext(ownerId, input.courseId); }
    catch { return { status: 503, body: { ok: false, error: "Could not load this course's approved study context. Please retry." } }; }
    if (!context) return { status: 404, body: { ok: false, error: "That active course is unavailable to this account." } };
  }

  try {
    const answer = await dependencies.runAssistant({
      messages: input.messages,
      courseName: context?.courseName ?? null,
      courseContext: context?.context.slice(0, MAX_CONTEXT_CHARS) ?? null
    });
    if (typeof answer !== "string" || !answer.trim() || answer.length > 6_000) throw new Error("Invalid service answer");
    return { status: 200, body: {
      ok: true, answer: answer.trim(),
      context: context ? { courseName: context.courseName, sources: context.sources } : null
    } };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    return { status: code === "RATE" ? 429 : code === "BUDGET" ? 503 : 502,
      body: { ok: false,
        error: code === "RATE" ? "The AI service is busy. Try again later." :
          code === "BUDGET" ? "The AI spending limit has been reached." :
          "GPT-6 Luna could not answer. Please retry."
      } };
  }
}
