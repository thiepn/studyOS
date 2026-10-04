import { createClient } from "@/lib/supabase/server";
import { StudyServiceError } from "./errors";
import type { AttemptInput } from "./types";

const RESULTS = new Set(["incorrect", "partial", "correct"]);
const INDEPENDENCE = new Set(["independent", "hint_1", "hint_2", "solution_exposed"]);
const ERROR_TYPES = new Set(["concept", "recall", "recognition", "method_selection", "execution", "proof_structure", "calculation", "misreading", "time_management", "programming_bug"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAttemptInput(value: unknown): AttemptInput {
  if (!value || typeof value !== "object") throw new StudyServiceError("Invalid attempt payload", "invalid_attempt");
  const input = value as Record<string, unknown>;
  if (typeof input.questionId !== "string" || !UUID.test(input.questionId)) throw new StudyServiceError("Valid questionId is required", "invalid_attempt");
  if (typeof input.result !== "string" || !RESULTS.has(input.result)) throw new StudyServiceError("Invalid result", "invalid_attempt");
  if (typeof input.independence !== "string" || !INDEPENDENCE.has(input.independence)) throw new StudyServiceError("Invalid independence level", "invalid_attempt");

  const durationSeconds = input.durationSeconds == null ? undefined : Number(input.durationSeconds);
  if (durationSeconds != null && (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 43200)) throw new StudyServiceError("Invalid duration", "invalid_attempt");
  const selfConfidence = input.selfConfidence == null ? undefined : Number(input.selfConfidence);
  if (selfConfidence != null && (!Number.isInteger(selfConfidence) || selfConfidence < 1 || selfConfidence > 5)) throw new StudyServiceError("Invalid confidence", "invalid_attempt");
  const errorTypes = input.errorTypes == null ? [] : input.errorTypes;
  if (!Array.isArray(errorTypes) || errorTypes.some((x) => typeof x !== "string" || !ERROR_TYPES.has(x))) throw new StudyServiceError("Invalid error types", "invalid_attempt");

  const completedAt = input.completedAt == null ? new Date().toISOString() : String(input.completedAt);
  if (Number.isNaN(Date.parse(completedAt))) throw new StudyServiceError("Invalid completedAt", "invalid_attempt");
  const startedAt = input.startedAt == null ? undefined : String(input.startedAt);
  if (startedAt && Number.isNaN(Date.parse(startedAt))) throw new StudyServiceError("Invalid startedAt", "invalid_attempt");
  if (startedAt && Date.parse(startedAt) > Date.parse(completedAt)) throw new StudyServiceError("startedAt cannot be after completedAt", "invalid_attempt");

  const clientRequestId = input.clientRequestId == null ? crypto.randomUUID() : String(input.clientRequestId);
  if (!UUID.test(clientRequestId)) throw new StudyServiceError("Invalid client request ID", "invalid_attempt");
  const sessionId = input.sessionId == null ? undefined : String(input.sessionId);
  if (sessionId && !UUID.test(sessionId)) throw new StudyServiceError("Invalid session ID", "invalid_attempt");

  return {
    clientRequestId, questionId: input.questionId, sessionId, startedAt,
    result: input.result as AttemptInput["result"], independence: input.independence as AttemptInput["independence"],
    durationSeconds, responseText: input.responseText == null ? undefined : String(input.responseText).slice(0, 20000),
    selfConfidence, errorTypes: errorTypes as AttemptInput["errorTypes"], completedAt,
  };
}

export async function recordAttempt(input: AttemptInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("study_record_attempt_v3", {
    p_request_id: input.clientRequestId ?? crypto.randomUUID(),
    p_question_id: input.questionId,
    p_result: input.result,
    p_independence: input.independence,
    p_session_id: input.sessionId ?? null,
    p_started_at: input.startedAt ?? null,
    p_duration_seconds: input.durationSeconds ?? null,
    p_response_text: input.responseText ?? null,
    p_self_confidence: input.selfConfidence ?? null,
    p_error_types: input.errorTypes ?? [],
    p_completed_at: input.completedAt ?? new Date().toISOString(),
  });
  if (error) throw new StudyServiceError("Could not record attempt", error.code || "attempt_write_failed", error);
  return data;
}
