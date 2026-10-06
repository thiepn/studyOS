import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { getSemesterScenarioData, type SemesterScenarioData } from "./scenario-data";
import { buildScenario, type ScenarioObjective } from "./scenario";
import { endOfWeekSunday, buildRollingProposal } from "./weekly-plan";
import { loadActiveWeekRuntime } from "./weekly-runtime";

const OBJECTIVES=new Set<ScenarioObjective>(["protect_passes","balanced","target_performance","exam_period"]);

function round15(value:number){return Math.max(0,Math.round(value/15)*15);}

export type RemainingWeekEnvelope={
  today:string;
  periodEndsOn:string;
  daysRemaining:number;
  feasibleCapacityMinutes:number;
  mandatoryMinutes:number;
  retentionMinutes:number;
  courseBudgetMinutes:number;
  calendarFreeMinutes:number|null;
};

export function deriveRemainingWeekEnvelope(data:SemesterScenarioData,capacityOverride?:number|null):RemainingWeekEnvelope{
  const today=data.today;
  const periodEndsOn=endOfWeekSunday(today);
  const days=data.calendarDays.filter(day=>day.date>=today&&day.date<=periodEndsOn);
  const daysRemaining=Math.max(1,days.length);
  const nominal=round15(data.dailyDefaultMinutes*daysRemaining);
  const calendarFree=data.calendarConnected
    ?Math.max(0,Math.round((data.todayRemainingFreeMinutes??0)+days.slice(1).reduce((sum,day)=>sum+Number(day.freeMinutes),0)))
    :null;
  const feasible=calendarFree==null?nominal:round15(Math.min(nominal,calendarFree));
  const selected=capacityOverride==null?feasible:round15(capacityOverride);
  if(selected<0||selected>feasible)throw new StudyServiceError("Committed weekly capacity must fit the currently feasible remainder of this week","invalid_week_capacity");
  const mandatory=days.reduce((sum,day)=>sum+Number(day.commitmentMinutes),0);
  const afterMandatory=Math.max(0,selected-mandatory);
  const retention=round15(Math.min(data.maxWeeklyRetentionMinutes,afterMandatory*data.configuredReviewRatio));
  return {
    today,periodEndsOn,daysRemaining,feasibleCapacityMinutes:selected,
    mandatoryMinutes:mandatory,retentionMinutes:retention,
    courseBudgetMinutes:Math.max(0,selected-Math.min(selected,mandatory)-retention),
    calendarFreeMinutes:calendarFree,
  };
}

function snapshot(data:SemesterScenarioData,plan:ReturnType<typeof buildScenario>){
  return {
    captured_at:new Date().toISOString(),
    source:data.source,
    calendar_connected:data.calendarConnected,
    calendar_stale:data.calendarStale,
    allocations:plan.allocations.map(row=>({
      course_id:row.courseId,target_minutes:row.allocatedMinutes,floor_minutes:row.protectionFloorMinutes,
      readiness_index:row.readinessIndex,band:row.band,runway:row.runway,
    })),
    courses:data.courses.map(course=>({
      course_id:course.courseId,decision_priority:course.decisionPriority,readiness_index:course.readinessIndex,
      band:course.band,runway:course.runway,action_title:course.actionTitle,
    })),
  };
}

export async function getWeeklyCommitmentData(){
  const scenarioData=await getSemesterScenarioData();
  const supabase=await createClient();
  const {semesterId,userId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const envelope=deriveRemainingWeekEnvelope(scenarioData);
  const runtime=await loadActiveWeekRuntime(db,userId,semesterId,scenarioData.today,scenarioData.timezone);
  const preview=buildScenario({
    weeklyCapacityMinutes:envelope.feasibleCapacityMinutes,
    mandatoryCommitmentMinutes:envelope.mandatoryMinutes,
    retentionReserveMinutes:envelope.retentionMinutes,
    objective:"balanced",
    courses:scenarioData.courses,
    floorAdjustments:scenarioData.calibration.floorAdjustments,
  });
  if(!runtime)return {scenarioData,envelope,preview,runtime:null,proposal:null};

  const objective=runtime.plan.objective as ScenarioObjective;
  const proposal=buildRollingProposal({
    objective,committedCourseBudgetMinutes:Number(runtime.plan.course_budget_minutes),
    currentRemainingCourseCapacityMinutes:envelope.courseBudgetMinutes,
    allocations:runtime.allocations,completion:runtime.completion,currentCourses:scenarioData.courses,
    progress:runtime.progress,floorAdjustments:scenarioData.calibration.floorAdjustments,
  });
  return {scenarioData,envelope,preview,runtime,proposal};
}

export async function commitWeeklyPlan(input:{objective:string;capacityMinutes?:number|null}){
  const objective=String(input.objective) as ScenarioObjective;
  if(!OBJECTIVES.has(objective))throw new StudyServiceError("Invalid weekly objective","invalid_week_objective");

  const scenarioData=await getSemesterScenarioData();
  const envelope=deriveRemainingWeekEnvelope(scenarioData,input.capacityMinutes??null);
  const scenario=buildScenario({
    weeklyCapacityMinutes:envelope.feasibleCapacityMinutes,
    mandatoryCommitmentMinutes:envelope.mandatoryMinutes,
    retentionReserveMinutes:envelope.retentionMinutes,
    objective,courses:scenarioData.courses,
    floorAdjustments:scenarioData.calibration.floorAdjustments,
  });
  if(scenario.mandatoryShortfallMinutes>0)throw new StudyServiceError(
    "Mandatory commitments exceed the selected weekly capacity. Increase capacity or change the commitments before committing the week.",
    "invalid_week_mandatory_deficit",
  );

  const supabase=await createClient();
  const {semesterId,userId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const existingResult=await db.from("study_week_plans").select("*")
    .eq("user_id",userId).eq("semester_id",semesterId).eq("period_ends_on",envelope.periodEndsOn).maybeSingle();
  if(existingResult.error)throw new StudyServiceError("Could not inspect weekly commitment",existingResult.error.code||"week_plan_read_failed",existingResult.error);
  if(existingResult.data?.status==="active")throw new StudyServiceError("This week already has an active commitment","invalid_week_plan_exists");

  const now=new Date().toISOString();
  const planPayload={
    user_id:userId,semester_id:semesterId,period_starts_on:envelope.today,period_ends_on:envelope.periodEndsOn,
    objective,capacity_source:input.capacityMinutes!=null&&round15(input.capacityMinutes)!==deriveRemainingWeekEnvelope(scenarioData).feasibleCapacityMinutes?"custom":scenarioData.source,
    weekly_capacity_minutes:scenario.weeklyCapacityMinutes,mandatory_reserve_minutes:scenario.mandatoryCommitmentMinutes,
    retention_reserve_minutes:scenario.retentionReserveMinutes,course_budget_minutes:scenario.allocatedCourseMinutes,
    status:"active",scenario_snapshot:snapshot(scenarioData,scenario),committed_at:now,last_rebalanced_at:null,last_rebalance_reason:null,
  };
  let plan:any;
  if(existingResult.data){
    const update=await db.from("study_week_plans").update({...planPayload,revision:Number(existingResult.data.revision??0)+1})
      .eq("id",existingResult.data.id).eq("user_id",userId).select("*").single();
    if(update.error)throw new StudyServiceError("Could not recommit weekly plan",update.error.code||"week_plan_write_failed",update.error);
    plan=update.data;
  }else{
    const insert=await db.from("study_week_plans").insert({...planPayload,revision:1}).select("*").single();
    if(insert.error)throw new StudyServiceError("Could not commit weekly plan",insert.error.code||"week_plan_write_failed",insert.error);
    plan=insert.data;
  }

  const allocationRows=scenario.allocations.map(row=>{
    const current=scenarioData.courses.find(course=>course.courseId===row.courseId)!;
    return {
      plan_id:plan.id,user_id:userId,course_id:row.courseId,
      original_minutes:row.allocatedMinutes,target_minutes:row.allocatedMinutes,protection_floor_minutes:row.protectionFloorMinutes,
      snapshot_readiness_index:row.readinessIndex,snapshot_decision_priority:current.decisionPriority,
      action_title:current.actionTitle,action_href:current.actionHref,action_authority:current.actionAuthority,
    };
  });
  const clear=await db.from("study_week_allocations").delete().eq("plan_id",plan.id).eq("user_id",userId);
  if(clear.error)throw new StudyServiceError("Could not reset weekly allocations",clear.error.code||"week_allocation_write_failed",clear.error);
  if(allocationRows.length){
    const insertAllocations=await db.from("study_week_allocations").insert(allocationRows);
    if(insertAllocations.error){
      await db.from("study_week_plans").update({status:"cancelled",last_rebalance_reason:"allocation write failed"}).eq("id",plan.id).eq("user_id",userId);
      throw new StudyServiceError("Weekly plan was not activated because allocations could not be saved",insertAllocations.error.code||"week_allocation_write_failed",insertAllocations.error);
    }
  }
  return {planId:plan.id,scenario};
}

export async function applyWeeklyRebalance(planId:string,objectiveOverride?:ScenarioObjective,reasonOverride?:string){
  if(!planId)throw new StudyServiceError("Weekly plan ID is required","invalid_week_plan_id");
  const data=await getWeeklyCommitmentData();
  const runtime=data.runtime;
  if(!runtime||runtime.plan.id!==planId)throw new StudyServiceError("Active weekly plan not found","invalid_week_plan_id");
  const objective=objectiveOverride??runtime.plan.objective as ScenarioObjective;
  const proposal=objectiveOverride
    ?buildRollingProposal({
      objective,committedCourseBudgetMinutes:Number(runtime.plan.course_budget_minutes),
      currentRemainingCourseCapacityMinutes:data.envelope.courseBudgetMinutes,
      allocations:runtime.allocations,completion:runtime.completion,currentCourses:data.scenarioData.courses,
      progress:runtime.progress,floorAdjustments:data.scenarioData.calibration.floorAdjustments,
    })
    :data.proposal;
  if(!proposal?.material)return {changed:false,reason:"no_change"};

  const supabase=await createClient();
  const {userId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const currentCourseMap=new Map(data.scenarioData.courses.map(course=>[course.courseId,course]));
  for(const row of proposal.courses){
    const current=currentCourseMap.get(row.courseId);
    const update=await db.from("study_week_allocations").update({
      target_minutes:row.proposedTargetMinutes,
      snapshot_readiness_index:current?.readinessIndex??null,
      snapshot_decision_priority:current?.decisionPriority??null,
      action_title:current?.actionTitle??runtime.allocations.find(a=>a.courseId===row.courseId)?.actionTitle??"Course work",
      action_href:current?.actionHref??runtime.allocations.find(a=>a.courseId===row.courseId)?.actionHref??("/courses/"+row.courseId),
      action_authority:current?.actionAuthority??runtime.allocations.find(a=>a.courseId===row.courseId)?.actionAuthority??"P17",
    }).eq("plan_id",planId).eq("course_id",row.courseId).eq("user_id",userId);
    if(update.error)throw new StudyServiceError("Could not apply weekly course reallocation",update.error.code||"week_rebalance_failed",update.error);
  }
  const now=new Date().toISOString();
  const planUpdate=await db.from("study_week_plans").update({
    objective,
    course_budget_minutes:proposal.proposedCourseBudgetMinutes,
    revision:Number(runtime.plan.revision)+1,last_rebalanced_at:now,last_rebalance_reason:reasonOverride??proposal.reason,
    scenario_snapshot:snapshot(data.scenarioData,buildScenario({
      weeklyCapacityMinutes:proposal.feasibleRemainingMinutes,mandatoryCommitmentMinutes:0,retentionReserveMinutes:0,
      objective,courses:data.scenarioData.courses,
      completedCourseMinutes:Object.fromEntries(runtime.completion.map(row=>[row.courseId,Math.min(row.creditedMinutes,runtime.allocations.find(a=>a.courseId===row.courseId)?.targetMinutes??row.creditedMinutes)])),
      floorAdjustments:data.scenarioData.calibration.floorAdjustments,
    })),
  }).eq("id",planId).eq("user_id",userId);
  if(planUpdate.error)throw new StudyServiceError("Could not finalize weekly reallocation",planUpdate.error.code||"week_rebalance_failed",planUpdate.error);
  return {changed:true,reason:reasonOverride??proposal.reason};
}

export async function cancelWeeklyPlan(planId:string){
  if(!planId)throw new StudyServiceError("Weekly plan ID is required","invalid_week_plan_id");
  const supabase=await createClient();
  const {userId}=await ensureStudyWorkspace(supabase);
  const result=await (supabase as any).from("study_week_plans").update({status:"cancelled",last_rebalance_reason:"cancelled by user"})
    .eq("id",planId).eq("user_id",userId).eq("status","active");
  if(result.error)throw new StudyServiceError("Could not cancel weekly plan",result.error.code||"week_plan_cancel_failed",result.error);
  return {ok:true};
}
