import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { buildCheckpointQueue, type CheckpointSkill } from "./checkpoint";
import { queueMinutes } from "./queue";
import { parseTeachingWeek } from "./course-study-flow";
import type { StudyQuestion } from "./types";

export type CourseRiskRow = {
  course_id: string; stable_key: string; display_name: string; short_name: string | null; course_kind: string;
  total_skills: number; tested_skills: number; due_or_at_risk_skills: number; overdue_7d_skills: number;
  relearning_skills: number; recent_lapse_skills: number; avg_retention_pressure: number;
  independent_success_percent_28d: number | null; actionable_backlog: number; unresolved_errors: number;
  operating_mode: "semester"|"transition"|"exam"|"post_exam"; days_to_exam: number | null;
  exam_ready_percent: number; risk_score: number; risk_band: "healthy"|"watch"|"at_risk"|"critical";
  risk_components: Record<string, number>; recommended_mix: Record<string, number>;
};

export type CheckpointRotation = {
  current_week_no: number; target_week_no: number; course_id: string; display_name: string; short_name: string | null;
  budget_minutes: number; week_starts_on: string; week_ends_on: string; eligible_skills: number; completed: boolean; due: boolean;
};

export function topRiskDrivers(row: CourseRiskRow, limit=2) {
  const labels: Record<string,string> = {
    retention: "retention pressure", overdue: "overdue reviews", recent_lapses: "recent lapses",
    workflow: "coursework backlog", errors: "unresolved errors", exam_readiness: "exam-readiness gap",
  };
  return Object.entries(row.risk_components ?? {})
    .map(([key,value])=>({key,label:labels[key] ?? key,value:Number(value)}))
    .filter((item)=>item.value>0)
    .sort((a,b)=>b.value-a.value)
    .slice(0,limit);
}

export async function getSemesterPulse() {
  const supabase = await createClient();
  const { semesterId } = await ensureStudyWorkspace(supabase);
  const db = supabase as any;
  const [riskResult, rotationResult, modeResult] = await Promise.all([
    db.from("study_course_risk").select("*").eq("semester_id",semesterId).order("risk_score",{ascending:false}),
    db.from("study_semester_checkpoint_rotation").select("*").eq("semester_id",semesterId).maybeSingle(),
    db.from("study_course_operating_mode").select("*").eq("semester_id",semesterId).order("days_to_exam",{ascending:true,nullsFirst:false}),
  ]);
  const error=riskResult.error||rotationResult.error||modeResult.error;
  if(error) throw new StudyServiceError("Could not load semester diagnostics",error.code||"semester_pulse_failed",error);
  return {
    risks:(riskResult.data??[]) as CourseRiskRow[],
    checkpoint:(rotationResult.data??null) as CheckpointRotation|null,
    modes:modeResult.data??[],
  };
}

export async function getCheckpointData() {
  const supabase = await createClient();
  const { semesterId } = await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const rotationResult=await db.from("study_semester_checkpoint_rotation").select("*").eq("semester_id",semesterId).maybeSingle();
  if(rotationResult.error) throw new StudyServiceError("Could not load checkpoint rotation",rotationResult.error.code||"checkpoint_failed",rotationResult.error);
  const rotation=(rotationResult.data??null) as CheckpointRotation|null;
  if(!rotation || rotation.current_week_no<1 || !rotation.eligible_skills) return {rotation,queue:[],queueMinutes:0};

  const skillsResult=await db.from("study_skill_retention_diagnostics").select("*")
    .eq("semester_id",semesterId).eq("course_id",rotation.course_id)
    .or(`first_week_no.is.null,first_week_no.lte.${rotation.target_week_no}`);
  if(skillsResult.error) throw new StudyServiceError("Could not load checkpoint skills",skillsResult.error.code||"checkpoint_failed",skillsResult.error);
  const skills=(skillsResult.data??[]) as CheckpointSkill[];
  const ids=skills.map((x)=>x.skill_id);
  let questions:StudyQuestion[]=[];
  if(ids.length){
    const q=await supabase.from("study_questions").select("*").in("primary_skill_id",ids).eq("active",true);
    if(q.error) throw new StudyServiceError("Could not load checkpoint questions",q.error.code||"checkpoint_failed",q.error);
    questions=(q.data??[]) as StudyQuestion[];
  }
  const queue=buildCheckpointQueue(skills,questions,rotation.target_week_no,Number(rotation.budget_minutes||60));
  return {rotation,queue,queueMinutes:queueMinutes(queue)};
}

/** A course-week cumulative checkpoint is separate from the semester rotation.
 * It reuses the existing checkpoint queue and recorded session evidence. */
export async function getCourseWeekCheckpointData(courseId: string | undefined, weekValue: string | undefined, scope: "cumulative"|"week"="cumulative") {
  const weekNo=parseTeachingWeek(weekValue);
  if (!courseId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseId) || weekNo==null) {
    throw new StudyServiceError("A valid course and teaching week are required", "invalid_checkpoint");
  }
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const courseResult=await db.from("study_courses").select("id,display_name,short_name")
    .eq("semester_id",semesterId).eq("id",courseId).eq("active",true).maybeSingle();
  if(courseResult.error)throw new StudyServiceError("Could not load checkpoint course",courseResult.error.code||"checkpoint_failed",courseResult.error);
  if(!courseResult.data)throw new StudyServiceError("This course does not belong to the active semester", "invalid_checkpoint");

  const skillQuery=db.from("study_skill_retention_diagnostics").select("*")
    .eq("semester_id",semesterId).eq("course_id",courseId);
  // Coursework introduces only the week's approved skills; checkpoint uses
  // all previously encountered skills to measure cumulative retention.
  const skillsResult=await (scope==="week"?skillQuery.eq("first_week_no",weekNo)
    :skillQuery.or(`first_week_no.is.null,first_week_no.lte.${weekNo}`));
  if(skillsResult.error)throw new StudyServiceError("Could not load cumulative course skills",skillsResult.error.code||"checkpoint_failed",skillsResult.error);
  const skills=(skillsResult.data??[]) as CheckpointSkill[];
  const ids=skills.map(skill=>skill.skill_id);
  let questions:StudyQuestion[]=[];
  if(ids.length) {
    const questionResult=await supabase.from("study_questions").select("*").in("primary_skill_id",ids).eq("active",true);
    if(questionResult.error)throw new StudyServiceError("Could not load checkpoint questions",questionResult.error.code||"checkpoint_failed",questionResult.error);
    questions=(questionResult.data??[]) as StudyQuestion[];
  }
  const queue=buildCheckpointQueue(skills,questions,weekNo,scope==="week"?35:60);
  return {course:courseResult.data as {id:string;display_name:string;short_name:string|null},weekNo,queue,queueMinutes:queueMinutes(queue)};
}
