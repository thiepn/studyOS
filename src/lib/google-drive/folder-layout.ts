/**
 * Single naming contract for folders provisioned in the user's own Google Drive.
 * Preserve existing names to adopt (not duplicate) a tree prepared through
 * the connected Drive. Do not store provider folder IDs in source code.
 */
export const STUDY_DRIVE_ROOT_NAME = "StudyOS";
export const LEGACY_STUDY_DRIVE_ROOT_NAME = "Semester OS";

export const STUDY_COURSE_SUBFOLDERS = [
  "00_COURSE", "01_WEEKS", "90_ALTKLAUSUREN",
  "91_SCRIPT", "92_REFERENCE", "99_SYSTEM",
] as const;

export const STUDY_COURSE_FOLDER_KEYS = [
  "course", "weeks", "exams", "script", "reference", "system",
] as const;

export function safeStudyDriveFolderName(value: string): string {
  return value.replaceAll("/", "-").replaceAll("\\", "-").trim().slice(0, 120) || "Semester";
}

export function studyCourseFolderName(sortOrder: number, displayName: string): string {
  return `${String(sortOrder).padStart(2, "0")}_${safeStudyDriveFolderName(displayName)}`;
}
