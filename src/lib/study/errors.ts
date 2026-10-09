export class StudyServiceError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
    this.name = "StudyServiceError";
  }
}

export function toStudyServiceError(error: unknown, fallback: string) {
  if (error instanceof StudyServiceError) return error;
  const maybe = error as { message?: string; code?: string } | null;
  return new StudyServiceError(maybe?.message || fallback, maybe?.code || "study_service_error", error);
}
