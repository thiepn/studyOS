import { StudyServiceError } from "./errors.ts";

/** Only validation and authentication errors are safe to disclose to clients. */
export function studyAttemptFailure(error: unknown): { status: number; message: string } {
  const code = error instanceof StudyServiceError ? error.code : "unknown";
  if (code === "invalid_attempt") return { status: 400, message: error instanceof Error ? error.message : "Invalid study attempt." };
  if (code === "not_authenticated") return { status: 401, message: error instanceof Error ? error.message : "Not authenticated." };
  // A denied write is permanent, not a transport outage eligible for offline retry.
  if (code === "42501") return { status: 403, message: "This account is not allowed to save this attempt. Your work has not been recorded." };
  return { status: 500, message: "Could not save study attempt." };
}
