import { buildScenario, type ScenarioCourse, type ScenarioObjective } from "./scenario";

export type WeeklyPaceStatus="not_started"|"ahead"|"on_track"|"behind"|"met";

export type WeeklyAllocationSnapshot={
  courseId:string;
  displayName:string;
  shortName:string|null;
  originalMinutes:number;
  targetMinutes:number;
  protectionFloorMinutes:number;
  snapshotDecisionPriority:number|null;
  actionTitle:string;
  actionHref:string;
  actionAuthority:string;
};

export type CourseCompletionEvidence={
  courseId:string;
  sessionMinutes:number;
  workflowMinutes:number;
  creditedMinutes:number;
};

export type WeeklyCourseProgress=WeeklyAllocationSnapshot&{
  completedMinutes:number;
  remainingMinutes:number;
  completionPercent:number;
  expectedMinutesByNow:number;
  paceStatus:WeeklyPaceStatus;
  paceGapMinutes:number;
};

export type WeeklyProgress={
  totalTargetMinutes:number;
  totalCompletedMinutes:number;
  totalRemainingMinutes:number;
  completionPercent:number;
  elapsedFraction:number;
  courses:WeeklyCourseProgress[];
};

export type RollingProposalCourse={
  courseId:string;
  displayName:string;
  shortName:string|null;
  completedMinutes:number;
  currentTargetMinutes:number;
  proposedTargetMinutes:number;
  deltaMinutes:number;
  proposedRemainingMinutes:number;
};

export type RollingProposal={
  material:boolean;
  reason:"capacity_loss"|"evidence_shift"|"pace_recovery"|"no_change";
  reasonText:string;
  committedCourseBudgetMinutes:number;
  completedCourseMinutes:number;
  committedRemainingMinutes:number;
  feasibleRemainingMinutes:number;
  proposedCourseBudgetMinutes:number;
  courses:RollingProposalCourse[];
};

function dayNumber(date:string){
  return Math.floor(Date.parse(date+"T00:00:00Z")/86_400_000);
}
export function addDays(date:string,days:number){
  const d=new Date(date+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10);
}
export function endOfWeekSunday(date:string){
  const day=new Date(date+"T12:00:00Z").getUTCDay();
  return addDays(date,(7-day)%7);
}
export function daysInclusive(start:string,end:string){
  return Math.max(1,dayNumber(end)-dayNumber(start)+1);
}

export function creditedMinutes(sessionMinutes:number,workflowMinutes:number){
  return Math.max(0,Math.max(Math.floor(sessionMinutes),Math.floor(workflowMinutes)));
}

export function buildWeeklyProgress(input:{
  periodStartsOn:string;
  periodEndsOn:string;
  committedAt:string;
  localToday:string;
  allocations:WeeklyAllocationSnapshot[];
  completion:CourseCompletionEvidence[];
}):WeeklyProgress{
  const startDate=input.committedAt.slice(0,10)>input.periodStartsOn?input.committedAt.slice(0,10):input.periodStartsOn;
  const effectiveToday=input.localToday<input.periodStartsOn?input.periodStartsOn:input.localToday>input.periodEndsOn?input.periodEndsOn:input.localToday;
  const totalDays=daysInclusive(startDate,input.periodEndsOn);
  const elapsedDays=input.localToday<startDate?0:Math.min(totalDays,daysInclusive(startDate,effectiveToday));
  const elapsedFraction=Math.min(1,Math.max(0,elapsedDays/totalDays));
  const completionMap=new Map(input.completion.map(row=>[row.courseId,row.creditedMinutes]));

  const courses=input.allocations.map((allocation):WeeklyCourseProgress=>{
    const completed=Math.max(0,completionMap.get(allocation.courseId)??0);
    const remaining=Math.max(0,allocation.targetMinutes-completed);
    const expected=Math.round(allocation.targetMinutes*elapsedFraction);
    const gap=completed-expected;
    let paceStatus:WeeklyPaceStatus="on_track";
    if(allocation.targetMinutes===0||remaining===0)paceStatus="met";
    else if(completed===0&&elapsedFraction>0)paceStatus="not_started";
    else if(gap>=30)paceStatus="ahead";
    else if(gap<=-30)paceStatus="behind";
    return {
      ...allocation,completedMinutes:completed,remainingMinutes:remaining,
      completionPercent:allocation.targetMinutes?Math.min(100,Math.round(completed/allocation.targetMinutes*100)):100,
      expectedMinutesByNow:expected,paceStatus,paceGapMinutes:gap,
    };
  });
  const totalTarget=courses.reduce((sum,row)=>sum+row.targetMinutes,0);
  const totalCompleted=courses.reduce((sum,row)=>sum+Math.min(row.completedMinutes,row.targetMinutes),0);
  return {
    totalTargetMinutes:totalTarget,totalCompletedMinutes:totalCompleted,
    totalRemainingMinutes:Math.max(0,totalTarget-totalCompleted),
    completionPercent:totalTarget?Math.min(100,Math.round(totalCompleted/totalTarget*100)):100,
    elapsedFraction,courses,
  };
}

export function weeklyPriorityAdjustment(progress:WeeklyCourseProgress|undefined,kind:string){
  if(!progress)return 0;
  if(["commitment","exam_strategy","review"].includes(kind))return 0;
  if(progress.remainingMinutes<=0)return -8;
  if(progress.paceStatus==="behind"||progress.paceStatus==="not_started")return 10;
  if(progress.paceStatus==="on_track")return 4;
  if(progress.paceStatus==="ahead")return 1;
  return 0;
}

export function buildRollingProposal(input:{
  objective:ScenarioObjective;
  committedCourseBudgetMinutes:number;
  currentRemainingCourseCapacityMinutes:number;
  allocations:WeeklyAllocationSnapshot[];
  completion:CourseCompletionEvidence[];
  currentCourses:ScenarioCourse[];
  progress:WeeklyProgress;
}):RollingProposal{
  const completedMap=Object.fromEntries(input.completion.map(row=>[row.courseId,row.creditedMinutes]));
  const completedTotal=input.allocations.reduce((sum,row)=>sum+Math.max(0,completedMap[row.courseId]??0),0);
  const committedRemaining=Math.max(0,input.committedCourseBudgetMinutes-completedTotal);
  const feasibleRemaining=Math.max(0,Math.min(committedRemaining,Math.floor(input.currentRemainingCourseCapacityMinutes)));

  const plan=buildScenario({
    weeklyCapacityMinutes:feasibleRemaining,
    mandatoryCommitmentMinutes:0,
    retentionReserveMinutes:0,
    objective:input.objective,
    courses:input.currentCourses,
    completedCourseMinutes:completedMap,
  });
  const planMap=new Map(plan.allocations.map(row=>[row.courseId,row]));
  const courses=input.allocations.map((allocation):RollingProposalCourse=>{
    const completed=Math.max(0,completedMap[allocation.courseId]??0);
    const future=planMap.get(allocation.courseId)?.allocatedMinutes??0;
    const proposed=Math.max(completed,completed+future);
    return {
      courseId:allocation.courseId,displayName:allocation.displayName,shortName:allocation.shortName,
      completedMinutes:completed,currentTargetMinutes:allocation.targetMinutes,
      proposedTargetMinutes:proposed,deltaMinutes:proposed-allocation.targetMinutes,
      proposedRemainingMinutes:Math.max(0,proposed-completed),
    };
  });

  const capacityLoss=feasibleRemaining<committedRemaining-15;
  const currentMap=new Map(input.currentCourses.map(course=>[course.courseId,course]));
  const evidenceShift=input.allocations.some(allocation=>{
    const current=currentMap.get(allocation.courseId);
    return current&&allocation.snapshotDecisionPriority!=null&&Math.abs(current.decisionPriority-allocation.snapshotDecisionPriority)>=15;
  });
  const paceRecovery=input.progress.courses.some(course=>course.paceStatus==="behind"||course.paceStatus==="not_started");
  const materialDelta=courses.some(course=>Math.abs(course.deltaMinutes)>=30);
  const material=capacityLoss||evidenceShift||materialDelta;
  const reason=capacityLoss?"capacity_loss":evidenceShift?"evidence_shift":paceRecovery&&materialDelta?"pace_recovery":"no_change";
  const reasonText=reason==="capacity_loss"
    ?"Remaining feasible study capacity has fallen below the unspent weekly commitment, so lower-value envelopes must shrink."
    :reason==="evidence_shift"
      ?"Current P17 priorities have moved materially since the weekly commitment, so the remaining envelope should follow the new evidence."
      :reason==="pace_recovery"
        ?"The week is behind its committed pace; remaining minutes are redistributed to protect the most valuable unfinished work."
        :"The committed envelopes remain compatible with current capacity and evidence.";

  return {
    material,reason,reasonText,committedCourseBudgetMinutes:input.committedCourseBudgetMinutes,
    completedCourseMinutes:completedTotal,committedRemainingMinutes:committedRemaining,
    feasibleRemainingMinutes:feasibleRemaining,proposedCourseBudgetMinutes:completedTotal+feasibleRemaining,courses,
  };
}
