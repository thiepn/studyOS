import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { buildCheckpointQueue, type CheckpointSkill } from "./checkpoint";
import { queueMinutes } from "./queue";
import type { StudyQuestion } from "./types";

export type CourseRiskRow = {
  course_id: string; display_name: string; short_name: string | null; course_kind: string;
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
