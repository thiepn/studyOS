import { getDailyOrchestration } from "./planning";
import { getCalendarRunwayForRange } from "./calendar-autopilot";
import { buildExamCommand, type ExamCommandInputCourse } from "./exam-command";

function configuredDailyBudget(orchestration:Awaited<ReturnType<typeof getDailyOrchestration>>){
  const configured=String(orchestration.settings?.default_mode??"normal");
  if(configured==="light")return Number(orchestration.capacity.light_budget_minutes);
  if(configured==="recovery")return Number(orchestration.capacity.recovery_budget_minutes);
  if(configured==="intensive")return Number(orchestration.capacity.intensive_budget_minutes);
  return Number(orchestration.capacity.normal_budget_minutes);
}

function configuredReviewBudget(orchestration:Awaited<ReturnType<typeof getDailyOrchestration>>){
  const configured=String(orchestration.settings?.default_mode??"normal");
  if(configured==="light")return Number(orchestration.capacity.light_review_budget_minutes);
  if(configured==="recovery")return Number(orchestration.capacity.recovery_review_budget_minutes);
  return Number(orchestration.capacity.review_daily_budget_minutes);
}

function localDate(iso:string,timezone:string){
  return new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso));
}

export async function getExamCommandCenterData(){
  const orchestration=await getDailyOrchestration();
  const today=String(orchestration.capacity.local_today);
  const runway=await getCalendarRunwayForRange(today,7,orchestration);
  const futureBudget=Math.max(0,configuredDailyBudget(orchestration));
  const futureReview=Math.max(0,configuredReviewBudget(orchestration));
  const timezone=runway.timezone;

  const overdueToday=orchestration.commitments
    .filter(commitment=>localDate(commitment.due_at,timezone)<today)
    .reduce((sum,commitment)=>sum+Number(commitment.estimated_minutes),0);

  const dayCapacities=runway.days.map((day,index)=>{
    const hardBudget=index===0?Number(orchestration.capacity.total_budget_minutes):futureBudget;
    const calendarCap=runway.connection?.status==="connected"?Number(day.freeMinutes):hardBudget;
    const base=Math.max(0,Math.min(hardBudget,calendarCap));
    const review=Math.min(base,index===0?Number(orchestration.capacity.effective_review_budget_minutes):futureReview);
    const commitmentReserve=Number(day.commitmentMinutes)+(index===0?overdueToday:0);
    return {
      date:day.date,
      availableMinutes:Math.max(0,base-review-Math.min(Math.max(0,base-review),commitmentReserve)),
    };
  });

  const sourceCourses:ExamCommandInputCourse[]=orchestration.examCommand.courses.map(course=>({
    courseId:course.courseId,displayName:course.displayName,shortName:course.shortName,
    operatingMode:course.operatingMode,daysToExam:course.daysToExam,
    readinessIndex:course.readinessIndex,band:course.band,trajectory:course.trajectory,
    decisionPriority:course.decisionPriority,nextAction:course.nextAction,
    nextActionTitle:course.nextActionTitle,nextActionHref:course.nextActionHref,
    nextActionMinutes:course.nextActionMinutes,lastSimulationAt:course.lastSimulationAt,
    lastVerifiedScorePercent:course.lastVerifiedScorePercent,
  }));
  const command=buildExamCommand({
    nowIso:new Date().toISOString(),courses:sourceCourses,dayCapacities,
  });
  const selectedExamCourseIds=new Set(
    orchestration.plan.selected.filter(item=>item.kind==="exam_strategy"&&item.courseId).map(item=>String(item.courseId))
  );

  return {
    today,timezone,runway,dayCapacities,command,selectedExamCourseIds:[...selectedExamCourseIds],
    totalDailyBudget:Number(orchestration.capacity.total_budget_minutes),
    reviewReserveToday:Number(orchestration.capacity.effective_review_budget_minutes),
    overdueCommitmentMinutesToday:overdueToday,
  };
}
