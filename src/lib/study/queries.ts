import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { buildReviewQueue, queueMinutes } from "./queue";
import { StudyServiceError } from "./errors";
import type { DueSkill, StudyQuestion, TodayData } from "./types";

export async function getTodayData(): Promise<TodayData> {
  const supabase = await createClient();
  const { semesterId } = await ensureStudyWorkspace(supabase);

  const [semesterResult, courseResult, dueResult] = await Promise.all([
    supabase.from("study_semesters").select("review_daily_budget_minutes").eq("id", semesterId).single(),
    supabase.from("study_course_progress").select("*").eq("semester_id", semesterId).order("sort_order"),
    supabase.from("study_due_skills").select("*").eq("semester_id", semesterId).eq("is_due", true).order("priority_score", { ascending: false }),
  ]);

  const error = semesterResult.error || courseResult.error || dueResult.error;
  if (error) throw new StudyServiceError("Could not load Semester OS state", error.code || "study_read_failed", error);

  const dueSkills = (dueResult.data ?? []) as DueSkill[];
  const skillIds = dueSkills.flatMap((row) => row.skill_id ? [row.skill_id] : []);
  let questions: StudyQuestion[] = [];
  if (skillIds.length) {
    const questionResult = await supabase.from("study_questions").select("*").in("primary_skill_id", skillIds).eq("active", true);
    if (questionResult.error) throw new StudyServiceError("Could not load review questions", questionResult.error.code || "question_read_failed", questionResult.error);
    questions = (questionResult.data ?? []) as StudyQuestion[];
  }

  const dailyBudgetMinutes = semesterResult.data?.review_daily_budget_minutes ?? 40;
  const queue = buildReviewQueue(dueSkills, questions, dailyBudgetMinutes);
  return { semesterId, dailyBudgetMinutes, courses: courseResult.data ?? [], queue, queueMinutes: queueMinutes(queue), dueSkillCount: dueSkills.length };
}

export async function getWeeklyHealth() {
  const supabase = await createClient();
  const { semesterId } = await ensureStudyWorkspace(supabase);
  const { data, error } = await supabase.from("study_weekly_health").select("*").eq("semester_id", semesterId).order("week_no");
  if (error) throw new StudyServiceError("Could not load weekly health", error.code || "weekly_health_failed", error);
  return data ?? [];
}
