import { createClient } from "@/lib/supabase/server";
import { StudyServiceError } from "./errors";
import type { ReviewSessionFinishInput, ReviewSessionStartInput } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_TYPES = new Set(["review","coursework","checkpoint","exam_simulation","relearning"]);

export function parseSessionStart(value: unknown): ReviewSessionStartInput {
  if (!value || typeof value !== "object") throw new StudyServiceError("Invalid session payload", "invalid_session");
  const input = value as Record<string, unknown>;
  const sessionId = String(input.sessionId ?? "");
  const plannedMinutes = Number(input.plannedMinutes);
  const startedAt = String(input.startedAt ?? new Date().toISOString());
  const sessionType = String(input.sessionType ?? "review") as ReviewSessionStartInput["sessionType"];
  const courseId = input.courseId == null || input.courseId === "" ? undefined : String(input.courseId);
  if (!UUID.test(sessionId)) throw new StudyServiceError("Invalid session ID", "invalid_session");
  if (!Number.isInteger(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > 600) throw new StudyServiceError("Invalid planned minutes", "invalid_session");
  if (Number.isNaN(Date.parse(startedAt))) throw new StudyServiceError("Invalid session start", "invalid_session");
  if (!sessionType || !SESSION_TYPES.has(sessionType)) throw new StudyServiceError("Invalid session type", "invalid_session");
  if (courseId && !UUID.test(courseId)) throw new StudyServiceError("Invalid session course", "invalid_session");
  return { sessionId, plannedMinutes, startedAt, sessionType, courseId };
}

export function parseSessionFinish(value: unknown): ReviewSessionFinishInput {
  if (!value || typeof value !== "object") throw new StudyServiceError("Invalid session payload", "invalid_session");
  const input = value as Record<string, unknown>;
  const sessionId = String(input.sessionId ?? "");
  const endedAt = String(input.endedAt ?? new Date().toISOString());
  if (!UUID.test(sessionId)) throw new StudyServiceError("Invalid session ID", "invalid_session");
  if (Number.isNaN(Date.parse(endedAt))) throw new StudyServiceError("Invalid session end", "invalid_session");
  return { sessionId, endedAt, note: input.note == null ? undefined : String(input.note).slice(0, 4000) };
}

export async function startReviewSession(input: ReviewSessionStartInput) {
  const supabase = await createClient();
  const { data, error } = await (supabase.rpc as any)("study_start_study_session", {
    p_session_id: input.sessionId,
    p_session_type: input.sessionType ?? "review",
    p_course_id: input.courseId ?? null,
    p_planned_minutes: input.plannedMinutes,
    p_started_at: input.startedAt,
  });
  if (error) throw new StudyServiceError("Could not start study session", error.code || "session_start_failed", error);
  return data;
}

export async function finishReviewSession(input: ReviewSessionFinishInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("study_finish_review_session", {
    p_session_id: input.sessionId, p_ended_at: input.endedAt, p_note: input.note ?? undefined,
  });
  if (error) throw new StudyServiceError("Could not finish study session", error.code || "session_finish_failed", error);
  return data;
}
