import type {
  Database, Json, StudyAttemptResult, StudyErrorType, StudyEvidenceDimension, StudyIndependence,
  StudyResourceType, StudySourceAuthority, StudySessionType,
} from "@/lib/supabase/database.types";

export type CourseProgress = Database["public"]["Views"]["study_course_progress"]["Row"];
export type DueSkill = Database["public"]["Views"]["study_due_skills"]["Row"];
export type StudyQuestion = Database["public"]["Tables"]["study_questions"]["Row"];
export type StudyResource = Database["public"]["Tables"]["study_resources"]["Row"];
export type StudyIngestionRun = Database["public"]["Tables"]["study_ingestion_runs"]["Row"];
export type StudyCourse = Database["public"]["Tables"]["study_courses"]["Row"];
export type StudyIntakeItem = Database["public"]["Tables"]["study_intake_items"]["Row"];
export type StudyDriveConnection = Database["public"]["Tables"]["study_drive_connections"]["Row"];

export type QueueItem = {
  skillId: string; courseId: string; skillTitle: string; priorityScore: number; targetDimension: StudyEvidenceDimension;
  question: Pick<StudyQuestion,"id"|"question_type"|"evidence_dimension"|"prompt"|"expected_minutes"|"difficulty"|"answer_key_or_rubric"|"hint_1"|"hint_2">;
};

export type AttemptInput = {
  clientRequestId?: string; questionId: string; sessionId?: string; startedAt?: string;
  result: StudyAttemptResult; independence: StudyIndependence; durationSeconds?: number;
  responseText?: string; selfConfidence?: number; errorTypes?: StudyErrorType[]; completedAt?: string;
};
export type ReviewSessionStartInput = { sessionId: string; plannedMinutes: number; startedAt: string; sessionType?: StudySessionType; courseId?: string };
export type ReviewSessionFinishInput = { sessionId: string; endedAt: string; note?: string };
export type ResourceRegistrationInput = {
  courseId: string; resourceType: StudyResourceType; title: string; driveUrl?: string; driveFileId?: string;
  originalFilename?: string; mimeType?: string; weekNo?: number; sourceAuthority?: StudySourceAuthority;
  publishedAt?: string; contentSha256?: string; logicalKey?: string;
};
export type IngestionCandidateInput = { payload: Json; processor?: string; processorVersion?: string; extractionConfidence?: number; validationIssues?: Json };
export type TodayData = { semesterId: string; dailyBudgetMinutes: number; courses: CourseProgress[]; queue: QueueItem[]; queueMinutes: number; dueSkillCount: number };
export type ResourcesData = {
  semesterId: string;
  courses: Pick<StudyCourse,"id"|"display_name"|"short_name"|"sort_order"|"drive_folder_url">[];
  resources: StudyResource[];
  weeks?: {id:string;week_no:number}[];
  ingestionRuns: StudyIngestionRun[];
  driveConnection: Pick<StudyDriveConnection,"status"|"google_account_email"|"inbox_folder_url"|"last_scan_at"|"last_scan_status"|"last_error"> | null;
  intakeItems: StudyIntakeItem[];
};
