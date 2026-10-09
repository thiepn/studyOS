import { StudyServiceError } from "./errors";

/** Only validation and authentication errors are safe to disclose to clients. */
export function studyAttemptFailure(error: unknown): { status: number; message: string } {
  const code = error instanceof StudyServiceError ? error.code : "unknown";
  if (code === "invalid_attempt") return { status: 400, message: error instanceof Error ? error.message : "Invalid study attempt." };
  if (code === "not_authenticated") return { status: 401, message: error instanceof Error ? error.message : "Not authenticated." };
  return { status: 500, message: "Could not save study attempt." };
}
