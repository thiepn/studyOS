import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { getDailyOrchestration, type CommitmentRow } from "./planning";
import { getCalendarRunwayForRange } from "./calendar-autopilot";
import { getWeeklyCalibrationProfile } from "./weekly-calibration-data";
import { buildScenario, courseFromForecast, type ScenarioObjective } from "./scenario";
import { loadWeekRuntimeForPlan } from "./weekly-runtime";
import {
  addDays,buildWeekReview,canCommitHandoff,deriveHandoffCapacity,isHandoffCommitWindow,isWeekClosable,mondayOnOrAfter,recommendHandoffObjective,
} from "./weekly-handoff";

type PlanRow=Database["public"]["Tables"]["study_week_plans"]["Row"];

const OBJECTIVES=new Set<ScenarioObjective>(["protect_passes","balanced","target_performance","exam_period"]);
const round15=(value:number)=>Math.max(0,Math.round(value/15)*15);

function configuredDailyBudget(orchestration:Awaited<ReturnType<typeof getDailyOrchestration>>){
  const configured=String(orchestration.settings?.default_mode??"normal");
  if(configured==="light")return Number(orchestration.capacity.light_budget_minutes);
  if(configured==="recovery")return Number(orchestration.capacity.recovery_budget_minutes);
  if(configured==="intensive")return Number(orchestration.capacity.intensive_budget_minutes);
  return Number(orchestration.capacity.normal_budget_minutes);
}

function localDate(iso:string,timezone:string){
  return new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
}

function snapshotReadiness(plan:PlanRow|null){
  const result:Record<string,number|null>={};
  if(!plan||!plan.scenario_snapshot||typeof plan.scenario_snapshot!=="object")return result;
  const raw=plan.scenario_snapshot as Record<string,unknown>;
  const courses=Array.isArray(raw.courses)?raw.courses:[];
  for(const item of courses){
    if(!item||typeof item!=="object")continue;
    const row=item as Record<string,unknown>;
    const id=String(row.course_id??"");
    if(!id)continue;
    const value=row.readiness_index;
    result[id]=value==null?null:Number(value);
  }
  return result;
}

function uniqueCommitments(rows:CommitmentRow[]){
  const map=new Map(rows.map(row=>[row.id,row]));
  return [...map.values()];
}

export async function getWeeklyHandoffData(){
  const orchestration=await getDailyOrchestration();
  const today=String(orchestration.capacity.local_today);
  const targetStart=mondayOnOrAfter(today);
  const targetEnd=addDays(targetStart,6);
  const previousEnd=addDays(targetStart,-1);
  const timezone=String(orchestration.capacity.timezone??"Europe/Berlin");

  const supabase=await createClient();
  const {semesterId,userId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;

  const [runway,calibrationData,previousResult,targetResult]=await Promise.all([
    getCalendarRunwayForRange(targetStart,7,orchestration),
    getWeeklyCalibrationProfile(),
    db.from("study_week_plans").select("*")
      .eq("user_id",userId).eq("semester_id",semesterId).eq("period_ends_on",previousEnd)
      .neq("status","cancelled").maybeSingle(),
    db.from("study_week_plans").select("*")
      .eq("user_id",userId).eq("semester_id",semesterId).eq("period_ends_on",targetEnd).maybeSingle(),
  ]);
  const queryError=previousResult.error||targetResult.error;
  if(queryError)throw new StudyServiceError("Could not load weekly handoff state",queryError.code||"weekly_handoff_read_failed",queryError);

  const previousPlan=(previousResult.data??null) as PlanRow|null;
  const targetPlan=(targetResult.data??null) as PlanRow|null;
  const previousRuntime=previousPlan
    ?await loadWeekRuntimeForPlan(db,userId,previousPlan,today,timezone)
    :null;

  const courses=orchestration.forecast.courses.map(courseFromForecast);
  const calibration=calibrationData.profile;
  const review=previousRuntime?buildWeekReview({
    progress:previousRuntime.progress,
    priorReadiness:snapshotReadiness(previousPlan),
    currentCourses:courses,
    floorAdjustments:calibration.floorAdjustments,
  }):null;
  const recommendation=recommendHandoffObjective({courses,review});

  const openCommitments=orchestration.commitments as CommitmentRow[];
  const carryover=openCommitments.filter(commitment=>localDate(commitment.due_at,runway.timezone)<targetStart);
  const dueInTarget=openCommitments.filter(commitment=>{
    const due=localDate(commitment.due_at,runway.timezone);
    return due>=targetStart&&due<=targetEnd;
  });
  const mandatoryCommitments=uniqueCommitments([...carryover,...dueInTarget]);
  const mandatoryMinutes=mandatoryCommitments.reduce((sum,row)=>sum+Number(row.estimated_minutes),0);

  const dailyDefault=Math.max(15,configuredDailyBudget(orchestration));
  const nominalWeekly=round15(dailyDefault*7);
  const calendarFree=runway.connection?.status==="connected"
    ?runway.days.reduce((sum,day)=>sum+Number(day.freeMinutes),0)
    :null;
  const feasible=calendarFree==null?nominalWeekly:round15(Math.min(nominalWeekly,calendarFree));
  const normalBudget=Math.max(1,Number(orchestration.capacity.normal_budget_minutes));
  const reviewRatio=Math.min(0.5,Math.max(0,Number(orchestration.capacity.review_daily_budget_minutes)/normalBudget));
  const maxRetentionMinutes=Number(orchestration.capacity.review_daily_budget_minutes)*7;
  const capacity=deriveHandoffCapacity({
    feasibleCapacityMinutes:feasible,mandatoryMinutes,reviewRatio,maxRetentionMinutes,calibration,
  });

  const scenario=buildScenario({
    weeklyCapacityMinutes:capacity.selectedCapacityMinutes,
    mandatoryCommitmentMinutes:mandatoryMinutes,
    retentionReserveMinutes:capacity.retentionMinutes,
    objective:recommendation.objective,courses,
    floorAdjustments:calibration.floorAdjustments,
  });

  const source=(runway.connection?.status==="connected"&&calendarFree!=null&&calendarFree<nominalWeekly
    ?"calendar_capped":"planning_default") as "calendar_capped"|"planning_default";

  return {
    today,timezone,targetStart,targetEnd,previousEnd,source,dailyDefaultMinutes:dailyDefault,
    nominalWeeklyMinutes:nominalWeekly,calendarFreeMinutes:calendarFree,reviewRatio,maxRetentionMinutes,
    runway:runway.days,calendarConnected:runway.connection?.status==="connected",calendarStale:runway.stale,
    calibration,courses,previousPlan,previousRuntime,review,targetPlan,
    previousEnded:Boolean(previousPlan&&isWeekClosable(previousPlan.period_ends_on,today)),
    carryoverCommitments:carryover,dueInTargetCommitments:dueInTarget,mandatoryCommitments,
    capacity,recommendation,scenario,
    closeAllowed:Boolean(previousPlan&&previousPlan.status!=="completed"&&isWeekClosable(previousPlan.period_ends_on,today)),
    commitAllowed:canCommitHandoff({
      today,targetStart,previousStatus:previousPlan?.status??null,targetStatus:targetPlan?.status??null,
    }),
  };
}

export type WeeklyHandoffData=Awaited<ReturnType<typeof getWeeklyHandoffData>>;

export async function closeReviewedWeek(planId:string){
  if(!planId)throw new StudyServiceError("Weekly plan ID is required","invalid_week_plan_id");
  const supabase=await createClient();
  const {semesterId,userId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const [planResult,capacityResult]=await Promise.all([
    db.from("study_week_plans").select("*").eq("id",planId).eq("user_id",userId).eq("semester_id",semesterId).single(),
    db.from("study_current_capacity").select("local_today").eq("semester_id",semesterId).maybeSingle(),
  ]);
  const error=planResult.error||capacityResult.error;
  if(error||!planResult.data)throw new StudyServiceError("Could not load reviewed week",error?.code||"invalid_week_plan_id",error);
  const plan=planResult.data as PlanRow;
  const today=String(capacityResult.data?.local_today??new Date().toISOString().slice(0,10));
  if(plan.status==="cancelled")throw new StudyServiceError("Cancelled weekly plans cannot be closed as reviewed","invalid_week_plan_status");
  if(plan.status==="completed")return {changed:false,status:"completed"};
  if(!isWeekClosable(plan.period_ends_on,today))throw new StudyServiceError("The weekly plan can only be closed after its Sunday has ended","invalid_week_not_finished");
  const result=await db.from("study_week_plans").update({status:"completed"}).eq("id",planId).eq("user_id",userId);
  if(result.error)throw new StudyServiceError("Could not close reviewed week",result.error.code||"week_close_failed",result.error);
  return {changed:true,status:"completed"};
}

export async function commitHandoffWeek(input:{objective:string;capacityMinutes?:number|null}){
  const objective=String(input.objective) as ScenarioObjective;
  if(!OBJECTIVES.has(objective))throw new StudyServiceError("Invalid handoff objective","invalid_week_objective");
  const data=await getWeeklyHandoffData();
  if(!isHandoffCommitWindow(data.today,data.targetStart))throw new StudyServiceError(
    "The next full week can only be committed on Sunday or Monday. Use the current Week view for midweek planning.",
    "invalid_handoff_window",
  );
  if(data.previousPlan&&data.previousPlan.status!=="completed")throw new StudyServiceError(
    "Close the prior weekly review before committing the next week.",
    "invalid_handoff_review_required",
  );
  if(data.targetPlan?.status==="active")throw new StudyServiceError("The handoff week already has an active commitment","invalid_week_plan_exists");
  if(data.targetPlan?.status==="completed")throw new StudyServiceError("The target week is already completed","invalid_week_plan_status");

  const selected=input.capacityMinutes==null?data.capacity.selectedCapacityMinutes:round15(Number(input.capacityMinutes));
  if(!Number.isFinite(selected)||selected<0||selected>data.capacity.feasibleCapacityMinutes)throw new StudyServiceError(
    "Handoff capacity must fit the currently feasible Monday–Sunday ceiling","invalid_week_capacity",
  );
  const mandatory=data.mandatoryCommitments.reduce((sum,row)=>sum+Number(row.estimated_minutes),0);
  const afterMandatory=Math.max(0,selected-Math.min(selected,mandatory));
  const retention=selected===data.capacity.selectedCapacityMinutes
    ?data.capacity.retentionMinutes
    :round15(Math.min(data.maxRetentionMinutes,afterMandatory*data.reviewRatio));
  const courses=data.courses;
  const scenario=buildScenario({
    weeklyCapacityMinutes:selected,mandatoryCommitmentMinutes:mandatory,retentionReserveMinutes:retention,
    objective,courses,floorAdjustments:data.calibration.floorAdjustments,
  });
  if(scenario.mandatoryShortfallMinutes>0)throw new StudyServiceError(
    "Open real commitments exceed the selected handoff capacity. Increase capacity or resolve a commitment before committing the week.",
    "invalid_week_mandatory_deficit",
  );

  const supabase=await createClient();
  const {semesterId,userId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const existingResult=await db.from("study_week_plans").select("*")
    .eq("user_id",userId).eq("semester_id",semesterId).eq("period_ends_on",data.targetEnd).maybeSingle();
  if(existingResult.error)throw new StudyServiceError("Could not inspect handoff week",existingResult.error.code||"week_plan_read_failed",existingResult.error);
  if(existingResult.data?.status==="active")throw new StudyServiceError("The handoff week already has an active commitment","invalid_week_plan_exists");

  const currentMap=new Map(courses.map(course=>[course.courseId,course]));
  const now=new Date().toISOString();
  const snapshot={
    captured_at:now,p21_handoff:true,handoff_from_plan_id:data.previousPlan?.id??null,
    recommended_objective:data.recommendation.objective,recommendation_reason:data.recommendation.reason,
    p20_capacity_signal:data.calibration.capacitySignal,p20_floor_adjustments:data.calibration.floorAdjustments,
    dropped_prior_envelope_minutes:data.review?.droppedEnvelopeMinutes??0,
    carryover_commitment_ids:data.carryoverCommitments.map(row=>row.id),
    allocations:scenario.allocations.map(row=>({
      course_id:row.courseId,target_minutes:row.allocatedMinutes,floor_minutes:row.protectionFloorMinutes,
      readiness_index:row.readinessIndex,band:row.band,runway:row.runway,
    })),
    courses:courses.map(course=>({
      course_id:course.courseId,decision_priority:course.decisionPriority,readiness_index:course.readinessIndex,
      band:course.band,runway:course.runway,action_title:course.actionTitle,
    })),
  };
  const payload={
    user_id:userId,semester_id:semesterId,period_starts_on:data.targetStart,period_ends_on:data.targetEnd,
    objective,capacity_source:selected===data.capacity.selectedCapacityMinutes?data.source:"custom",
    weekly_capacity_minutes:scenario.weeklyCapacityMinutes,mandatory_reserve_minutes:scenario.mandatoryCommitmentMinutes,
    retention_reserve_minutes:scenario.retentionReserveMinutes,course_budget_minutes:scenario.allocatedCourseMinutes,
    status:"active",scenario_snapshot:snapshot,committed_at:now,last_rebalanced_at:null,last_rebalance_reason:null,
  };
  let plan:any;
  if(existingResult.data){
    if(existingResult.data.status!=="cancelled")throw new StudyServiceError("The target weekly plan cannot be replaced","invalid_week_plan_status");
    const update=await db.from("study_week_plans").update({...payload,revision:Number(existingResult.data.revision??0)+1})
      .eq("id",existingResult.data.id).eq("user_id",userId).select("*").single();
    if(update.error)throw new StudyServiceError("Could not recommit handoff week",update.error.code||"week_plan_write_failed",update.error);
    plan=update.data;
  }else{
    const insert=await db.from("study_week_plans").insert({...payload,revision:1}).select("*").single();
    if(insert.error)throw new StudyServiceError("Could not commit handoff week",insert.error.code||"week_plan_write_failed",insert.error);
    plan=insert.data;
  }

  const allocationRows=scenario.allocations.map(row=>{
    const current=currentMap.get(row.courseId)!;
    return {
      plan_id:plan.id,user_id:userId,course_id:row.courseId,
      original_minutes:row.allocatedMinutes,target_minutes:row.allocatedMinutes,protection_floor_minutes:row.protectionFloorMinutes,
      snapshot_readiness_index:row.readinessIndex,snapshot_decision_priority:current.decisionPriority,
      action_title:current.actionTitle,action_href:current.actionHref,action_authority:current.actionAuthority,
    };
  });
  const clear=await db.from("study_week_allocations").delete().eq("plan_id",plan.id).eq("user_id",userId);
  if(clear.error)throw new StudyServiceError("Could not reset handoff allocations",clear.error.code||"week_allocation_write_failed",clear.error);
  if(allocationRows.length){
    const inserted=await db.from("study_week_allocations").insert(allocationRows);
    if(inserted.error){
      await db.from("study_week_plans").update({status:"cancelled",last_rebalance_reason:"handoff allocation write failed"}).eq("id",plan.id).eq("user_id",userId);
      throw new StudyServiceError("Handoff week was not activated because allocations could not be saved",inserted.error.code||"week_allocation_write_failed",inserted.error);
    }
  }
  return {planId:plan.id,periodStartsOn:data.targetStart,periodEndsOn:data.targetEnd,scenario};
}
