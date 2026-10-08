/** Identifies explicitly completed course-week checkpoint sessions.
 * This is an evidence linkage token, not an authorization credential. */
export function weeklyCheckpointSessionNote(courseId: string, weekNo: number): string {
  return `[studyos-weekly-checkpoint:${courseId}:${weekNo}]`;
}

export function isCompletedWeeklyCheckpointSession(
  session: { note?: string | null; ended_at?: string | null },
  courseId: string,
  weekNo: number,
): boolean {
  return Boolean(
    session.ended_at &&
    Number.isFinite(Date.parse(session.ended_at)) &&
    session.note?.includes(weeklyCheckpointSessionNote(courseId, weekNo)),
  );
}

/** Require an explicitly recorded independent sheet attempt before offering solution links.
 * A UI disclosure is not access control on files stored in Google Drive. */
export function canOpenWeekSolutions(
  week: { exercise_count: number; exercise_attempt_completed_at: string | null },
): boolean {
  return week.exercise_count === 0 || Boolean(week.exercise_attempt_completed_at);
}

export function parseTeachingWeek(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 40 ? parsed : null;
}

/** Contextual views must not mutate the caller's all-semester source collection. */
export function scopeCourseRecords<T extends {course_id:string}>(
  records:readonly T[], courseId:string|null,
):T[]{
  return courseId?records.filter(record=>record.course_id===courseId):[...records];
}
