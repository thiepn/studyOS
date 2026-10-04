export class StudyServiceError extends Error {
  constructor(message: string, readonly code: string, readonly cause?: unknown) {
    super(message);
    this.name = "StudyServiceError";
  }
}

export function toStudyServiceError(error: unknown, fallback: string) {
  if (error instanceof StudyServiceError) return error;
  const maybe = error as { message?: string; code?: string } | null;
  return new StudyServiceError(maybe?.message || fallback, maybe?.code || "study_service_error", error);
}
