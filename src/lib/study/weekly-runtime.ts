import type { Database } from "@/lib/supabase/database.types";
import { StudyServiceError } from "./errors";
import { zonedDateTimeToUtc } from "./calendar-scheduler";
import {
  addDays,buildWeeklyProgress,creditedMinutes,type CourseCompletionEvidence,type WeeklyAllocationSnapshot,
} from "./weekly-plan";

type WeekPlanRow=Database["public"]["Tables"]["study_week_plans"]["Row"];
type WeekAllocationRow=Database["public"]["Tables"]["study_week_allocations"]["Row"];

export const WORKFLOW_MINUTES={
  lecture_retrieval_completed_at:10,
  exercise_attempt_completed_at:60,
  solution_reconciled_at:30,
  checkpoint_completed_at:60,
} as const;

export type ActiveWeekRuntime={
  plan:WeekPlanRow;
  allocations:WeeklyAllocationSnapshot[];
  completion:CourseCompletionEvidence[];
  progress:ReturnType<typeof buildWeeklyProgress>;
  daysRemaining:number;
};

function dayNumber(date:string){return Math.floor(Date.parse(date+"T00:00:00Z")/86_400_000);}

export async function loadWeekRuntimeForPlan(
  db:any,
  userId:string,
  plan:WeekPlanRow,
  localToday:string,
  timezone:string,
):Promise<ActiveWeekRuntime>{
  const allocationResult=await db.from("study_week_allocations").select("*")
    .eq("plan_id",plan.id).eq("user_id",userId);
  if(allocationResult.error)throw new StudyServiceError("Could not load weekly allocations",allocationResult.error.code||"week_allocation_read_failed",allocationResult.error);
  const rows=(allocationResult.data??[]) as WeekAllocationRow[];
  const courseIds=rows.map(row=>row.course_id);

  let courses:Array<{id:string;display_name:string;short_name:string|null}>=[];
  let sessions:Array<any>=[];
  let workflows:Array<any>=[];
  if(courseIds.length){
    const endExclusive=zonedDateTimeToUtc(addDays(plan.period_ends_on,1),"00:00",timezone).toISOString();
    const [courseResult,sessionResult,workflowResult]=await Promise.all([
      db.from("study_courses").select("id,display_name,short_name").in("id",courseIds),
      db.from("study_sessions").select("course_id,actual_minutes,planned_minutes,started_at,ended_at")
        .eq("user_id",userId).in("course_id",courseIds)
        .gte("started_at",plan.committed_at).lt("started_at",endExclusive).not("ended_at","is",null),
      db.from("study_week_workflow").select("course_id,lecture_retrieval_completed_at,exercise_attempt_completed_at,solution_reconciled_at,checkpoint_completed_at")
        .eq("user_id",userId).in("course_id",courseIds),
    ]);
    const error=courseResult.error||sessionResult.error||workflowResult.error;
    if(error)throw new StudyServiceError("Could not load weekly progress evidence",error.code||"week_progress_read_failed",error);
    courses=courseResult.data??[];sessions=sessionResult.data??[];workflows=workflowResult.data??[];
  }

  const courseMap=new Map(courses.map(course=>[String(course.id),course]));
  const sessionMinutes=new Map<string,number>();
  for(const session of sessions){
    const id=String(session.course_id);
    sessionMinutes.set(id,(sessionMinutes.get(id)??0)+Math.max(0,Number(session.actual_minutes??session.planned_minutes??0)));
  }
  const workflowMinutes=new Map<string,number>();
  const start=Date.parse(plan.committed_at);
  const end=Date.parse(zonedDateTimeToUtc(addDays(plan.period_ends_on,1),"00:00",timezone).toISOString());
  for(const workflow of workflows){
    const id=String(workflow.course_id);let minutes=0;
    for(const [field,value] of Object.entries(WORKFLOW_MINUTES)){
      const timestamp=workflow[field];
      if(timestamp&&Date.parse(String(timestamp))>=start&&Date.parse(String(timestamp))<end)minutes+=value;
    }
    workflowMinutes.set(id,(workflowMinutes.get(id)??0)+minutes);
  }

  const allocations:WeeklyAllocationSnapshot[]=rows.map(row=>{
    const course=courseMap.get(row.course_id);
    return {
      courseId:row.course_id,displayName:course?.display_name??"Course",shortName:course?.short_name??null,
      originalMinutes:Number(row.original_minutes),targetMinutes:Number(row.target_minutes),
      protectionFloorMinutes:Number(row.protection_floor_minutes),
      snapshotDecisionPriority:row.snapshot_decision_priority==null?null:Number(row.snapshot_decision_priority),
      actionTitle:row.action_title,actionHref:row.action_href,actionAuthority:row.action_authority,
    };
  });
  const completion:CourseCompletionEvidence[]=allocations.map(allocation=>{
    const session=sessionMinutes.get(allocation.courseId)??0;
    const workflow=workflowMinutes.get(allocation.courseId)??0;
    return {courseId:allocation.courseId,sessionMinutes:session,workflowMinutes:workflow,creditedMinutes:creditedMinutes(session,workflow)};
  });
  const progress=buildWeeklyProgress({
    periodStartsOn:plan.period_starts_on,periodEndsOn:plan.period_ends_on,committedAt:plan.committed_at,
    localToday,allocations,completion,
  });
  const daysRemaining=Math.max(0,dayNumber(plan.period_ends_on)-dayNumber(localToday)+1);
  return {plan,allocations,completion,progress,daysRemaining};
}

export async function loadActiveWeekRuntime(
  db:any,
  userId:string,
  semesterId:string,
  localToday:string,
  timezone:string,
):Promise<ActiveWeekRuntime|null>{
  const planResult=await db.from("study_week_plans").select("*")
    .eq("user_id",userId).eq("semester_id",semesterId).eq("status","active")
    .lte("period_starts_on",localToday).gte("period_ends_on",localToday)
    .order("period_ends_on",{ascending:true}).limit(1).maybeSingle();
  if(planResult.error)throw new StudyServiceError("Could not load weekly commitment",planResult.error.code||"week_plan_read_failed",planResult.error);
  const plan=(planResult.data??null) as WeekPlanRow|null;
  if(!plan)return null;
  return loadWeekRuntimeForPlan(db,userId,plan,localToday,timezone);
}
