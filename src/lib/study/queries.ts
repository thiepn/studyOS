import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { buildReviewQueue, queueMinutes, scopeDueSkills } from "./queue";
import { StudyServiceError } from "./errors";
import type { DueSkill, StudyQuestion, TodayData } from "./types";
import { cache } from "react";

/** Directory reads no question bodies and never builds a practice queue. */
export const getCourseSummaries = cache(async () => {
  const supabase = await createClient();
  const { semesterId } = await ensureStudyWorkspace(supabase);
  const { data, error } = await supabase.from("study_course_progress").select("*")
    .eq("semester_id", semesterId).order("sort_order");
  if (error) throw new StudyServiceError("Could not load courses", error.code || "course_read_failed", error);
  return data ?? [];
});

export async function getTodayData(courseId?: string | null): Promise<TodayData> {
  const supabase = await createClient();
  const { semesterId } = await ensureStudyWorkspace(supabase);

  const [semesterResult, capacityResult, courseResult, dueResult, operatingModeResult, resultResult] = await Promise.all([
    supabase.from("study_semesters").select("review_daily_budget_minutes").eq("id", semesterId).single(),
    (supabase as any).from("study_current_capacity").select("effective_review_budget_minutes").eq("semester_id", semesterId).maybeSingle(),
    getCourseSummaries().then(data => ({data, error:null})),
    supabase.from("study_due_skills").select("*").eq("semester_id", semesterId).eq("is_due", true).order("priority_score", { ascending: false }),
    supabase.from("study_course_operating_mode").select("course_id,operating_mode").eq("semester_id", semesterId),
    (supabase as any).from("study_exam_results").select("course_id,attempt_no,result_status,outcome,retake_decision")
      .eq("semester_id", semesterId).eq("result_status","official").order("attempt_no",{ascending:false}),
  ]);

  const error = semesterResult.error || capacityResult.error || courseResult.error || dueResult.error || operatingModeResult.error || resultResult.error;
  if (error) throw new StudyServiceError("Could not load StudyOS state", error.code || "study_read_failed", error);

  const postExamCourses = new Set(
    (operatingModeResult.data ?? []).filter((row) => row.operating_mode === "post_exam").map((row) => row.course_id)
  );
  const latestOfficial = new Map<string, any>();
  for (const row of resultResult.data ?? []) {
    const id=String(row.course_id);
    if(!latestOfficial.has(id))latestOfficial.set(id,row);
  }
  const resultBlockedCourses = new Set(
    [...latestOfficial.entries()]
      .filter(([,row]) => row.outcome==="passed" || row.retake_decision==="pending" || row.retake_decision==="declined")
      .map(([id]) => id)
  );
  const dueSkills = ((dueResult.data ?? []) as DueSkill[]).filter((row) =>
    !row.course_id || (!postExamCourses.has(row.course_id) && !resultBlockedCourses.has(row.course_id))
  );
  const scopedSkills = scopeDueSkills(dueSkills, courseId);
  const skillIds = scopedSkills.flatMap((row) => row.skill_id ? [row.skill_id] : []);
  let questions: StudyQuestion[] = [];
  if (skillIds.length) {
    const questionResult = await supabase.from("study_questions").select("*").in("primary_skill_id", skillIds).eq("active", true);
    if (questionResult.error) throw new StudyServiceError("Could not load review questions", questionResult.error.code || "question_read_failed", questionResult.error);
    questions = (questionResult.data ?? []) as StudyQuestion[];
  }

  const dailyBudgetMinutes = Number(capacityResult.data?.effective_review_budget_minutes ?? semesterResult.data?.review_daily_budget_minutes ?? 40);
  const queue = buildReviewQueue(scopedSkills, questions, dailyBudgetMinutes);
  return { semesterId, dailyBudgetMinutes, courses: courseResult.data ?? [], queue, queueMinutes: queueMinutes(queue), dueSkillCount: scopedSkills.length };
}

export async function getWeeklyHealth() {
  const supabase = await createClient();
  const { semesterId } = await ensureStudyWorkspace(supabase);
  const { data, error } = await supabase.from("study_weekly_health").select("*").eq("semester_id", semesterId).order("week_no");
  if (error) throw new StudyServiceError("Could not load weekly health", error.code || "weekly_health_failed", error);
  return data ?? [];
}
