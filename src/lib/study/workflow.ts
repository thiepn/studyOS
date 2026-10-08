import { createClient } from "@/lib/supabase/server";
import type { StudyErrorType } from "@/lib/supabase/database.types";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import type { WeekMilestone } from "./workflow-state";
import { isCompletedWeeklyCheckpointSession } from "./course-study-flow";
import { isIndependentRepairEvidence, validFindingSource } from "./repair-policy";
import { summarizeWeekPractice, type WeekSkillAnchor, type WeekPracticeQuestion } from "./week-qualification";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ERROR_TYPES = new Set<StudyErrorType>([
  "concept","recall","recognition","method_selection","execution","proof_structure",
  "calculation","misreading","time_management","programming_bug",
]);

export type CourseConfiguration = {
  course_id: string;
  semester_id: string;
  stable_key: string;
  display_name: string;
  short_name: string | null;
  course_kind: "major" | "retake" | "minor";
  professor: string | null;
  credits: number | null;
  exam_at: string | null;
  exam_duration_minutes: number | null;
  exam_format: string | null;
  sort_order: number;
  active: boolean;
  drive_folder_url: string | null;
  expected_lectures_per_week: number | null;
  expects_exercise: boolean | null;
  expects_solution: boolean | null;
  lecture_retrieval_target_hours: number | null;
  solution_reconcile_target_hours: number | null;
  checkpoint_weight: number | null;
};

export type WeekActionRow = {
  teaching_week_id: string;
  course_id: string;
  week_no: number;
  resource_count: number;
  lecture_count: number;
  exercise_count: number;
  solution_count: number;
  verified_resources: number;
  pending_resources: number;
  candidate_runs: number;
  skill_count: number;
  new_skills: number;
  learning_skills: number;
  fragile_skills: number;
  stable_skills: number;
  exam_ready_skills: number;
  due_skills: number;
  due_minutes: number;
  unresolved_errors: number;
  health_status: string;
  next_action: string;
  open_findings: number;
  scheduled_repairs: number;
  lecture_retrieval_due: boolean;
  exercise_attempt_due: boolean;
  solution_reconcile_due: boolean;
  checkpoint_due: boolean;
  lecture_retrieval_completed_at: string | null;
  exercise_attempt_completed_at: string | null;
  solution_reconciled_at: string | null;
  checkpoint_completed_at: string | null;
};

export type ReconciliationFinding = {
  id: string;
  teaching_week_id: string;
  course_id: string;
  skill_id: string | null;
  error_type: StudyErrorType | null;
  title: string;
  detail: string | null;
  severity: number;
  status: "open" | "repair_scheduled" | "resolved" | "dismissed";
  repair_scheduled_at: string | null;
  created_at: string;
  exercise_resource_id: string | null;
  solution_resource_id: string | null;
};

export type SkillOption = { id: string; title: string; stable_key: string };
export type CourseMasterMapRow = {
  topic_id: string; topic_key: string; topic_title: string; topic_description: string | null;
  first_week_no: number | null; latest_source_week: number | null; skill_count: number;
  new_skills: number; learning_skills: number; fragile_skills: number; stable_skills: number; exam_ready_skills: number;
  unresolved_errors: number; durable_percent: number; source_resource_count: number; source_titles: string[];
  skills: Array<{
    id: string; stable_key: string; title: string; kind: string; required_dimensions: string[];
    mastery_state: string; next_review_at: string | null; exam_importance: number; prerequisite_importance: number;
    unresolved_errors: number; evidence?: Record<string, number>;
  }>;
};
export type WeekResource = {
  id: string;
  teaching_week_id: string | null;
  resource_type: string;
  title: string;
  drive_url: string | null;
  processing_status: string;
};

export async function getCourseWorkflow(courseId: string) {
  if (!UUID.test(courseId)) throw new StudyServiceError("Invalid course ID", "invalid_course");
  const supabase = await createClient();
  const { semesterId } = await ensureStudyWorkspace(supabase);
  const db = supabase as any;

  const [configuration, weeks, findings, skills, resources, masterMap, weekAnchors, practiceQuestions] = await Promise.all([
    db.from("study_course_configuration").select("*").eq("semester_id", semesterId).eq("course_id", courseId).single(),
    db.from("study_week_actions").select("*").eq("semester_id", semesterId).eq("course_id", courseId).order("week_no", { ascending: false }),
    db.from("study_reconciliation_findings").select("id,teaching_week_id,course_id,skill_id,error_type,title,detail,severity,status,repair_scheduled_at,created_at,exercise_resource_id,solution_resource_id").eq("course_id", courseId).in("status", ["open","repair_scheduled"]).order("created_at", { ascending: false }),
    db.from("study_skills").select("id,title,stable_key").eq("course_id", courseId).eq("active", true).order("title"),
    db.from("study_resources").select("id,teaching_week_id,resource_type,title,drive_url,processing_status").eq("course_id", courseId).eq("active", true).order("created_at", { ascending: false }),
    db.from("study_course_master_map").select("*").eq("semester_id", semesterId).eq("course_id", courseId).order("first_week_no", { ascending: true, nullsFirst: false }).order("topic_title"),
    db.from("study_skill_retention_diagnostics").select("skill_id,first_week_no")
      .eq("semester_id",semesterId).eq("course_id",courseId),
    db.from("study_questions").select("id,primary_skill_id,expected_minutes,active,answer_key_or_rubric")
      .eq("course_id",courseId).eq("active",true),
  ]);
  const error = configuration.error || weeks.error || findings.error || skills.error || resources.error || masterMap.error || weekAnchors.error || practiceQuestions.error;
  if (error) throw new StudyServiceError("Could not load course workflow", error.code || "course_workflow_read_failed", error);

  return {
    configuration: configuration.data as CourseConfiguration,
    weeks: (weeks.data ?? []) as WeekActionRow[],
    findings: (findings.data ?? []) as ReconciliationFinding[],
    skills: (skills.data ?? []) as SkillOption[],
    resources: (resources.data ?? []) as WeekResource[],
    masterMap: (masterMap.data ?? []) as CourseMasterMapRow[],
    weekPractice: summarizeWeekPractice(
      (weekAnchors.data??[]) as WeekSkillAnchor[],
      (practiceQuestions.data??[]) as WeekPracticeQuestion[],
    ),
  };
}

export function parseCourseConfiguration(value: unknown) {
  if (!value || typeof value !== "object") throw new StudyServiceError("Invalid configuration payload", "invalid_course_config");
  const input = value as Record<string, unknown>;
  const displayName = String(input.displayName ?? "").trim();
  if (!displayName || displayName.length > 160) throw new StudyServiceError("Course name must be 1–160 characters", "invalid_course_config");
  const numeric = (key: string, min: number, max: number, integer = false) => {
    const raw = input[key];
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      throw new StudyServiceError(`Invalid ${key}`, "invalid_course_config");
    }
    return n;
  };
  const examAt = input.examAt == null || input.examAt === "" ? null : String(input.examAt);
  if (examAt && Number.isNaN(Date.parse(examAt))) throw new StudyServiceError("Invalid exam date", "invalid_course_config");
  return {
    displayName,
    shortName: input.shortName == null ? null : String(input.shortName).trim().slice(0, 40) || null,
    professor: input.professor == null ? null : String(input.professor).trim().slice(0, 160) || null,
    credits: numeric("credits", 0.5, 60),
    examAt,
    examDurationMinutes: numeric("examDurationMinutes", 15, 600, true),
    examFormat: input.examFormat == null ? null : String(input.examFormat).trim().slice(0, 200) || null,
    expectedLecturesPerWeek: numeric("expectedLecturesPerWeek", 0, 7, true),
    expectsExercise: input.expectsExercise !== false,
    expectsSolution: input.expectsSolution !== false,
    lectureRetrievalTargetHours: numeric("lectureRetrievalTargetHours", 1, 168, true) ?? 24,
    solutionReconcileTargetHours: numeric("solutionReconcileTargetHours", 1, 336, true) ?? 48,
    checkpointWeight: numeric("checkpointWeight", 0.1, 10) ?? 1,
  };
}

export async function updateCourseConfiguration(courseId: string, input: ReturnType<typeof parseCourseConfiguration>) {
  if (!UUID.test(courseId)) throw new StudyServiceError("Invalid course ID", "invalid_course_config");
  const supabase = await createClient();
  const { data, error } = await (supabase.rpc as any)("study_update_course_configuration", {
    p_course_id: courseId,
    p_display_name: input.displayName,
    p_short_name: input.shortName,
    p_professor: input.professor,
    p_credits: input.credits,
    p_exam_at: input.examAt,
    p_exam_duration_minutes: input.examDurationMinutes,
    p_exam_format: input.examFormat,
    p_expected_lectures_per_week: input.expectedLecturesPerWeek,
    p_expects_exercise: input.expectsExercise,
    p_expects_solution: input.expectsSolution,
    p_lecture_retrieval_target_hours: input.lectureRetrievalTargetHours,
    p_solution_reconcile_target_hours: input.solutionReconcileTargetHours,
    p_checkpoint_weight: input.checkpointWeight,
  });
  if (error) throw new StudyServiceError("Could not update course configuration", error.code || "course_config_write_failed", error);
  return data;
}

export function parseMilestone(value: unknown): { weekNo: number; milestone: WeekMilestone; note?: string } {
  if (!value || typeof value !== "object") throw new StudyServiceError("Invalid milestone payload", "invalid_milestone");
  const input = value as Record<string, unknown>;
  const weekNo = Number(input.weekNo);
  const milestone = String(input.milestone ?? "") as WeekMilestone;
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 40) throw new StudyServiceError("Invalid week", "invalid_milestone");
  if (!["lecture_retrieval","exercise_attempt","solution_reconcile","weekly_checkpoint"].includes(milestone)) throw new StudyServiceError("Invalid milestone", "invalid_milestone");
  return { weekNo, milestone, note: input.note == null ? undefined : String(input.note).slice(0, 4000) };
}

export async function markWeekMilestone(courseId: string, input: ReturnType<typeof parseMilestone>) {
  if (!UUID.test(courseId)) throw new StudyServiceError("Invalid course ID", "invalid_milestone");
  const supabase = await createClient();
  if (input.milestone === "weekly_checkpoint") {
    // Completing an empty review, or simply pressing Mark, is not a checkpoint.
    // Confirm an ended course/week-tagged session with recorded independent evidence.
    const {semesterId}=await ensureStudyWorkspace(supabase);
    const db=supabase as any;
    const courseResult=await db.from("study_courses").select("id").eq("id",courseId)
      .eq("semester_id",semesterId).eq("active",true).maybeSingle();
    if(courseResult.error)throw new StudyServiceError("Could not verify checkpoint course",courseResult.error.code||"checkpoint_evidence_failed",courseResult.error);
    if(!courseResult.data)throw new StudyServiceError("Course is not active in this semester","invalid_milestone");
    const sessionsResult=await db.from("study_sessions").select("id,note,ended_at")
      .eq("course_id",courseId).eq("session_type","checkpoint").not("ended_at","is",null)
      .order("ended_at",{ascending:false}).limit(100);
    if(sessionsResult.error)throw new StudyServiceError("Could not verify checkpoint sessions",sessionsResult.error.code||"checkpoint_evidence_failed",sessionsResult.error);
    const matching=(sessionsResult.data??[]).filter((session:{note:string|null;ended_at:string|null})=>
      isCompletedWeeklyCheckpointSession(session,courseId,input.weekNo));
    if(!matching.length) {
      throw new StudyServiceError("Complete this course-week checkpoint in Study before marking it done.","checkpoint_session_required");
    }
    const attemptsResult=await db.from("study_attempts").select("id")
      .in("session_id",matching.map((session:{id:string})=>session.id))
      .eq("independence","independent").limit(1);
    if(attemptsResult.error)throw new StudyServiceError("Could not verify checkpoint attempts",attemptsResult.error.code||"checkpoint_evidence_failed",attemptsResult.error);
    if(!attemptsResult.data?.length) {
      throw new StudyServiceError("The checkpoint needs at least one saved, fully independent attempt. Hint-assisted and offline-pending attempts cannot certify this checkpoint.","checkpoint_session_required");
    }
  }
  const { data, error } = await (supabase.rpc as any)("study_mark_week_milestone", {
    p_course_id: courseId, p_week_no: input.weekNo, p_milestone: input.milestone,
    p_note: input.note ?? null, p_completed_at: new Date().toISOString(),
  });
  if (error) throw new StudyServiceError("Could not complete weekly milestone", error.code || "milestone_write_failed", error);
  return data;
}

export function parseFinding(value: unknown) {
  if (!value || typeof value !== "object") throw new StudyServiceError("Invalid finding payload", "invalid_finding");
  const input = value as Record<string, unknown>;
  const weekNo = Number(input.weekNo);
  const title = String(input.title ?? "").trim();
  const severity = Number(input.severity ?? 2);
  const errorType = input.errorType == null || input.errorType === "" ? null : String(input.errorType) as StudyErrorType;
  const skillId = input.skillId == null || input.skillId === "" ? null : String(input.skillId);
  const exerciseResourceId = input.exerciseResourceId == null || input.exerciseResourceId === "" ? null : String(input.exerciseResourceId);
  const solutionResourceId = input.solutionResourceId == null || input.solutionResourceId === "" ? null : String(input.solutionResourceId);
  if (!Number.isInteger(weekNo) || weekNo < 1 || weekNo > 40) throw new StudyServiceError("Invalid week", "invalid_finding");
  if (!title || title.length > 240) throw new StudyServiceError("Finding title must be 1–240 characters", "invalid_finding");
  if (![1,2,3].includes(severity)) throw new StudyServiceError("Invalid severity", "invalid_finding");
  if (errorType && !ERROR_TYPES.has(errorType)) throw new StudyServiceError("Invalid error type", "invalid_finding");
  if (skillId && !UUID.test(skillId)) throw new StudyServiceError("Invalid skill", "invalid_finding");
  if ([exerciseResourceId,solutionResourceId].some(id=>id&&!UUID.test(id))) throw new StudyServiceError("Invalid resource reference", "invalid_finding");
  return {
    weekNo, title, severity, errorType, skillId, exerciseResourceId, solutionResourceId,
    detail: input.detail == null ? null : String(input.detail).trim().slice(0, 4000) || null,
  };
}

export async function addReconciliationFinding(courseId: string, input: ReturnType<typeof parseFinding>) {
  if (!UUID.test(courseId)) throw new StudyServiceError("Invalid course ID", "invalid_finding");
  const supabase = await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const weekResult=await db.from("study_week_actions").select("teaching_week_id")
    .eq("semester_id",semesterId).eq("course_id",courseId).eq("week_no",input.weekNo).maybeSingle();
  if(weekResult.error)throw new StudyServiceError("Could not verify finding week",weekResult.error.code||"finding_read_failed",weekResult.error);
  if(!weekResult.data)throw new StudyServiceError("The selected teaching week is not in the active course","invalid_finding");
  if(input.skillId){
    const skillResult=await db.from("study_skills").select("id").eq("id",input.skillId).eq("course_id",courseId).eq("active",true).maybeSingle();
    if(skillResult.error)throw new StudyServiceError("Could not verify finding skill",skillResult.error.code||"finding_read_failed",skillResult.error);
    if(!skillResult.data)throw new StudyServiceError("The selected skill does not belong to this course","invalid_finding");
  }
  const ids=[input.exerciseResourceId,input.solutionResourceId].filter(Boolean) as string[];
  if(ids.length){
    const resourcesResult=await db.from("study_resources").select("id,teaching_week_id,resource_type").eq("course_id",courseId).eq("active",true).in("id",ids);
    if(resourcesResult.error)throw new StudyServiceError("Could not verify finding sources",resourcesResult.error.code||"finding_read_failed",resourcesResult.error);
    const resources=(resourcesResult.data??[]) as Array<{id:string;teaching_week_id:string|null;resource_type:string}>;
    if(!validFindingSource(resources.find(r=>r.id===input.exerciseResourceId),input.exerciseResourceId,weekResult.data.teaching_week_id,"exercise")
      || !validFindingSource(resources.find(r=>r.id===input.solutionResourceId),input.solutionResourceId,weekResult.data.teaching_week_id,"solution"))
      throw new StudyServiceError("Exercise and solution must be linked to the same course week","invalid_finding");
  }
  const { data, error } = await (supabase.rpc as any)("study_add_reconciliation_finding", {
    p_course_id: courseId, p_week_no: input.weekNo, p_title: input.title, p_detail: input.detail,
    p_error_type: input.errorType, p_severity: input.severity, p_skill_id: input.skillId,
    p_exercise_resource_id: input.exerciseResourceId, p_solution_resource_id: input.solutionResourceId,
  });
  if (error) throw new StudyServiceError("Could not add reconciliation finding", error.code || "finding_write_failed", error);
  return data;
}

export async function resolveReconciliationFinding(findingId: string, note?: string, dismiss = false) {
  if (!UUID.test(findingId)) throw new StudyServiceError("Invalid finding ID", "invalid_finding");
  const supabase = await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const findingResult=await db.from("study_reconciliation_findings")
    .select("id,course_id,skill_id,created_at,status").eq("id",findingId).maybeSingle();
  if(findingResult.error)throw new StudyServiceError("Could not load finding",findingResult.error.code||"finding_read_failed",findingResult.error);
  const finding=findingResult.data as {id:string;course_id:string;skill_id:string|null;created_at:string;status:string}|null;
  if(!finding)throw new StudyServiceError("Finding is not available","invalid_finding");
  const courseResult=await db.from("study_courses").select("id").eq("id",finding.course_id)
    .eq("semester_id",semesterId).eq("active",true).maybeSingle();
  if(courseResult.error)throw new StudyServiceError("Could not verify finding course",courseResult.error.code||"finding_read_failed",courseResult.error);
  if(!courseResult.data)throw new StudyServiceError("Finding belongs to another or inactive semester","invalid_finding");
  if(!["open","repair_scheduled"].includes(finding.status))throw new StudyServiceError("This finding is already closed","invalid_finding");

  let resolutionNote=note?.trim()||"Resolved after verified independent repair.";
  if(dismiss) {
    if(!note || note.trim().length<10) throw new StudyServiceError("Give a reason of at least 10 characters to dismiss a finding","invalid_finding");
  } else {
    if(!finding.skill_id) throw new StudyServiceError("Map this finding to a course skill before resolving it","repair_evidence_required");
    const attemptsResult=await db.from("study_attempts")
      .select("id,completed_at,result,independence,skill_id").eq("course_id",finding.course_id)
      .eq("skill_id",finding.skill_id).gt("completed_at",finding.created_at)
      .eq("result","correct").eq("independence","independent").order("completed_at",{ascending:false}).limit(10);
    if(attemptsResult.error)throw new StudyServiceError("Could not verify independent repair",attemptsResult.error.code||"repair_check_failed",attemptsResult.error);
    const success=((attemptsResult.data??[]) as Array<{id:string;completed_at:string;result:string;independence:string;skill_id:string}>)
      .find(item=>isIndependentRepairEvidence(item,finding.skill_id!,finding.created_at));
    if(!success)throw new StudyServiceError("Complete and sync a correct, fully independent attempt for the mapped skill after this finding was recorded. Then resolve it.","repair_evidence_required");
    resolutionNote=`${resolutionNote.slice(0,3600)} · Independent repair attempt ${success.id}`;
  }
  const { data, error } = await (supabase.rpc as any)("study_resolve_reconciliation_finding", {
    p_finding_id: findingId, p_resolution_note: resolutionNote, p_dismiss: dismiss,
  });
  if (error) throw new StudyServiceError("Could not resolve finding", error.code || "finding_resolve_failed", error);
  return data;
}
