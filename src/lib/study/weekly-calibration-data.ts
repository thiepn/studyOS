import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { zonedDateTimeToUtc } from "./calendar-scheduler";
import { addDays, creditedMinutes } from "./weekly-plan";
import { WORKFLOW_MINUTES } from "./weekly-runtime";
import {
  buildWeeklyCalibrationProfile,
  type SessionEstimateSample,
  type WeeklyExecutionObservation,
} from "./weekly-calibration";

type PlanRow=Database["public"]["Tables"]["study_week_plans"]["Row"];
type AllocationRow=Database["public"]["Tables"]["study_week_allocations"]["Row"];

function localDate(timezone:string){
  return new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}

export async function getWeeklyCalibrationProfile(){
  const supabase=await createClient();
  const {semesterId,userId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const [semesterResult,capacityResult]=await Promise.all([
    db.from("study_semesters").select("timezone").eq("id",semesterId).single(),
    db.from("study_current_capacity").select("local_today,timezone").eq("semester_id",semesterId).maybeSingle(),
  ]);
  const setupError=semesterResult.error||capacityResult.error;
  if(setupError)throw new StudyServiceError("Could not load P20 calibration context",setupError.code||"weekly_calibration_context_failed",setupError);
  const timezone=String(capacityResult.data?.timezone??semesterResult.data?.timezone??"Europe/Berlin");
  const today=String(capacityResult.data?.local_today??localDate(timezone));

  const plansResult=await db.from("study_week_plans").select("*")
    .eq("user_id",userId).eq("semester_id",semesterId).neq("status","cancelled")
    .lt("period_ends_on",today).order("period_ends_on",{ascending:true});
  if(plansResult.error)throw new StudyServiceError("Could not load completed weekly plans",plansResult.error.code||"weekly_calibration_plan_read_failed",plansResult.error);
  const plans=(plansResult.data??[]) as PlanRow[];
  if(!plans.length){
    return {
      today,timezone,
      profile:buildWeeklyCalibrationProfile([],[]),
      completedPlanIds:[] as string[],
    };
  }

  const planIds=plans.map(plan=>plan.id);
  const allocationsResult=await db.from("study_week_allocations").select("*").eq("user_id",userId).in("plan_id",planIds);
  if(allocationsResult.error)throw new StudyServiceError("Could not load historical weekly allocations",allocationsResult.error.code||"weekly_calibration_allocation_read_failed",allocationsResult.error);
  const allocations=(allocationsResult.data??[]) as AllocationRow[];
  const courseIds=[...new Set(allocations.map(row=>row.course_id))];

  let courses:Array<{id:string;display_name:string;short_name:string|null}>=[];
  let sessions:Array<{course_id:string|null;planned_minutes:number|null;actual_minutes:number|null;started_at:string;ended_at:string|null}>=[];
  let workflows:Array<Record<string,unknown>>=[];
  if(courseIds.length){
    const earliest=plans.map(plan=>plan.committed_at).sort()[0];
    const latestEnd=plans.map(plan=>zonedDateTimeToUtc(addDays(plan.period_ends_on,1),"00:00",timezone).toISOString()).sort().at(-1)!;
    const [courseResult,sessionResult,workflowResult]=await Promise.all([
      db.from("study_courses").select("id,display_name,short_name").in("id",courseIds),
      db.from("study_sessions").select("course_id,planned_minutes,actual_minutes,started_at,ended_at")
        .eq("user_id",userId).in("course_id",courseIds)
        .gte("started_at",earliest).lt("started_at",latestEnd).not("ended_at","is",null),
      db.from("study_week_workflow").select("course_id,lecture_retrieval_completed_at,exercise_attempt_completed_at,solution_reconciled_at,checkpoint_completed_at")
        .eq("user_id",userId).in("course_id",courseIds),
    ]);
    const error=courseResult.error||sessionResult.error||workflowResult.error;
    if(error)throw new StudyServiceError("Could not load completed-week execution evidence",error.code||"weekly_calibration_evidence_read_failed",error);
    courses=courseResult.data??[];
    sessions=sessionResult.data??[];
    workflows=workflowResult.data??[];
  }

  const courseMap=new Map(courses.map(course=>[String(course.id),course]));
  const allocationsByPlan=new Map<string,AllocationRow[]>();
  for(const allocation of allocations){
    const rows=allocationsByPlan.get(allocation.plan_id)??[];
    rows.push(allocation);allocationsByPlan.set(allocation.plan_id,rows);
  }

  const observations:WeeklyExecutionObservation[]=[];
  const estimateSamples:SessionEstimateSample[]=[];

  for(const plan of plans){
    const rows=allocationsByPlan.get(plan.id)??[];
    const start=Date.parse(plan.committed_at);
    const endExclusive=Date.parse(zonedDateTimeToUtc(addDays(plan.period_ends_on,1),"00:00",timezone).toISOString());
    const courseCredits=new Map<string,{session:number;workflow:number}>();

    for(const allocation of rows)courseCredits.set(allocation.course_id,{session:0,workflow:0});

    for(const session of sessions){
      if(!session.course_id||!courseCredits.has(session.course_id))continue;
      const at=Date.parse(session.started_at);
      if(at<start||at>=endExclusive)continue;
      const minutes=Math.max(0,Number(session.actual_minutes??session.planned_minutes??0));
      const current=courseCredits.get(session.course_id)!;
      current.session+=minutes;
      if(session.planned_minutes!=null&&session.actual_minutes!=null&&Number(session.planned_minutes)>0&&Number(session.actual_minutes)>0){
        estimateSamples.push({
          courseId:session.course_id,
          plannedMinutes:Number(session.planned_minutes),
          actualMinutes:Number(session.actual_minutes),
        });
      }
    }

    for(const workflow of workflows){
      const courseId=String(workflow.course_id??"");
      if(!courseCredits.has(courseId))continue;
      let minutes=0;
      for(const [field,value] of Object.entries(WORKFLOW_MINUTES)){
        const timestamp=workflow[field];
        if(timestamp&&Date.parse(String(timestamp))>=start&&Date.parse(String(timestamp))<endExclusive)minutes+=value;
      }
      courseCredits.get(courseId)!.workflow+=minutes;
    }

    const targetTotal=rows.reduce((sum,row)=>sum+Number(row.target_minutes),0);
    const creditedMap=new Map(rows.map(row=>{
      const credit=courseCredits.get(row.course_id)??{session:0,workflow:0};
      return [row.course_id,creditedMinutes(credit.session,credit.workflow)] as const;
    }));
    const creditedTotal=rows.reduce((sum,row)=>sum+(creditedMap.get(row.course_id)??0),0);

    for(const row of rows){
      const course=courseMap.get(row.course_id);
      observations.push({
        planId:plan.id,periodEndsOn:plan.period_ends_on,courseId:row.course_id,
        displayName:course?.display_name??"Course",shortName:course?.short_name??null,
        originalMinutes:Number(row.original_minutes),targetMinutes:Number(row.target_minutes),
        protectionFloorMinutes:Number(row.protection_floor_minutes),
        creditedMinutes:creditedMap.get(row.course_id)??0,
        snapshotReadinessIndex:row.snapshot_readiness_index==null?null:Number(row.snapshot_readiness_index),
        weekTargetMinutes:targetTotal,weekCreditedMinutes:creditedTotal,
        rebalanced:Number(plan.revision)>1||Number(row.original_minutes)!==Number(row.target_minutes),
      });
    }
  }

  return {
    today,timezone,
    profile:buildWeeklyCalibrationProfile(observations,estimateSamples),
    completedPlanIds:planIds,
  };
}

export type WeeklyCalibrationData=Awaited<ReturnType<typeof getWeeklyCalibrationProfile>>;
