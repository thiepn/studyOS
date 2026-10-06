import { getDailyOrchestration } from "./planning";
import { getCalendarAutopilot } from "./calendar-autopilot";
import { buildScenario, buildStandardScenarios, courseFromForecast, type ScenarioObjective } from "./scenario";

function round15(value:number){return Math.max(0,Math.round(value/15)*15);}

function configuredDailyBudget(orchestration:Awaited<ReturnType<typeof getDailyOrchestration>>){
  const configured=String(orchestration.settings?.default_mode??"normal");
  if(configured==="light")return Number(orchestration.capacity.light_budget_minutes);
  if(configured==="recovery")return Number(orchestration.capacity.recovery_budget_minutes);
  if(configured==="intensive")return Number(orchestration.capacity.intensive_budget_minutes);
  return Number(orchestration.capacity.normal_budget_minutes);
}

export async function getSemesterScenarioData(){
  const orchestration=await getDailyOrchestration();
  const calendar=await getCalendarAutopilot(orchestration);
  const dailyDefault=Math.max(15,configuredDailyBudget(orchestration));
  const nominalWeekly=round15(dailyDefault*7);
  const calendarFree=calendar.connection?.status==="connected"
    ?calendar.weekly.reduce((sum,day)=>sum+Number(day.freeMinutes),0)
    :null;
  const baselineWeekly=calendarFree==null?nominalWeekly:round15(Math.min(nominalWeekly,calendarFree));
  const mandatoryCommitments=calendar.weekly.reduce((sum,day)=>sum+Number(day.commitmentMinutes),0);

  const normalBudget=Math.max(1,Number(orchestration.capacity.normal_budget_minutes));
  const configuredReviewRatio=Math.min(0.5,Math.max(0,Number(orchestration.capacity.review_daily_budget_minutes)/normalBudget));
  const afterMandatory=Math.max(0,baselineWeekly-mandatoryCommitments);
  const maxWeeklyRetentionMinutes=Number(orchestration.capacity.review_daily_budget_minutes)*7;
  const retentionReserve=round15(Math.min(
    maxWeeklyRetentionMinutes,
    afterMandatory*configuredReviewRatio,
  ));

  const courses=orchestration.forecast.courses.map(courseFromForecast);
  const input={
    weeklyCapacityMinutes:baselineWeekly,
    mandatoryCommitmentMinutes:mandatoryCommitments,
    retentionReserveMinutes:retentionReserve,
    courses,
  };
  const standard=buildStandardScenarios(input);

  const constrainedCapacity=round15(Math.max(mandatoryCommitments,baselineWeekly*0.75));
  const expandedCeiling=calendarFree==null?round15(nominalWeekly*1.5):round15(calendarFree);
  const expandedCapacity=Math.max(baselineWeekly,Math.min(expandedCeiling,round15(baselineWeekly*1.25)));
  const stressCapacities=[
    {key:"constrained",label:"75% capacity",minutes:constrainedCapacity},
    {key:"baseline",label:"Baseline",minutes:baselineWeekly},
    {key:"expanded",label:"Expanded",minutes:expandedCapacity},
  ];
  const stress=stressCapacities.map((item)=>({
    ...item,
    plan:buildScenario({
      weeklyCapacityMinutes:item.minutes,
      mandatoryCommitmentMinutes:mandatoryCommitments,
      retentionReserveMinutes:round15(Math.min(Number(orchestration.capacity.review_daily_budget_minutes)*7,Math.max(0,item.minutes-mandatoryCommitments)*configuredReviewRatio)),
      objective:"balanced",
      courses,
    }),
  }));

  const maxCustomCapacity=Math.max(180,calendarFree==null?round15(nominalWeekly*1.5):round15(calendarFree));
  const minCustomCapacity=Math.min(maxCustomCapacity,Math.max(60,round15(Math.min(baselineWeekly,mandatoryCommitments+60))));

  return {
    source:(calendar.connection?.status==="connected"?"calendar_capped":"planning_default") as "calendar_capped"|"planning_default",
    dailyDefaultMinutes:dailyDefault,nominalWeeklyMinutes:nominalWeekly,calendarFreeMinutes:calendarFree,
    baselineWeeklyMinutes:baselineWeekly,mandatoryCommitmentMinutes:mandatoryCommitments,
    retentionReserveMinutes:retentionReserve,maxWeeklyRetentionMinutes,configuredReviewRatio,
    minCustomCapacity,maxCustomCapacity,courses,standard,stress,
    calendarConnected:calendar.connection?.status==="connected",calendarStale:calendar.stale,
    calendarDays:calendar.weekly,
  };
}

export type SemesterScenarioData=Awaited<ReturnType<typeof getSemesterScenarioData>>;
export const SCENARIO_OBJECTIVES:ScenarioObjective[]=["protect_passes","balanced","target_performance","exam_period"];
