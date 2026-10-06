import type { CourseForecast, ReadinessBand, RunwayBand } from "./forecast";

export type ScenarioObjective="protect_passes"|"balanced"|"target_performance"|"exam_period";
export type ScenarioCapacitySource="planning_default"|"calendar_capped"|"custom";

export type ScenarioCourse={
  courseId:string;
  displayName:string;
  shortName:string|null;
  courseKind:string;
  credits:number|null;
  readinessIndex:number|null;
  band:ReadinessBand;
  confidence:string;
  trajectory:string;
  runway:RunwayBand;
  decisionPriority:number;
  actionValue:number;
  actionTitle:string;
  actionMinutes:number;
  postExam:boolean;
};

export type ScenarioInput={
  weeklyCapacityMinutes:number;
  mandatoryCommitmentMinutes:number;
  retentionReserveMinutes:number;
  objective:ScenarioObjective;
  courses:ScenarioCourse[];
};

export type CourseAllocation={
  courseId:string;
  displayName:string;
  shortName:string|null;
  courseKind:string;
  allocatedMinutes:number;
  protectionFloorMinutes:number;
  floorMet:boolean;
  floorShortfallMinutes:number;
  sharePercent:number;
  marginalScore:number;
  reason:string;
  sacrificeRank:number|null;
  readinessIndex:number|null;
  band:ReadinessBand;
  runway:RunwayBand;
  actionTitle:string;
};

export type ScenarioPlan={
  objective:ScenarioObjective;
  weeklyCapacityMinutes:number;
  mandatoryCommitmentMinutes:number;
  mandatoryDemandMinutes:number;
  mandatoryShortfallMinutes:number;
  retentionReserveMinutes:number;
  allocatableCourseMinutes:number;
  allocatedCourseMinutes:number;
  unusedMinutes:number;
  feasibleProtection:boolean;
  totalProtectionFloorMinutes:number;
  totalFloorShortfallMinutes:number;
  allocations:CourseAllocation[];
  sacrificedCourses:number;
  summary:string;
};

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const creditWeight=(credits:number|null)=>Math.max(1,Math.min(2,Number(credits??6)/6));

export function protectionFloor(course:ScenarioCourse){
  if(course.postExam)return 0;
  const bandBase:Record<ReadinessBand,number>={
    insufficient_evidence:45,
    at_risk:90,
    fragile:75,
    pass_ready:45,
    target_ready:30,
    strong:20,
  };
  const runwayBoost:Record<RunwayBand,number>={
    unknown:0,ample:0,workable:15,compressed:45,urgent:90,passed:0,
  };
  let floor=bandBase[course.band]+runwayBoost[course.runway];
  if(course.trajectory==="declining")floor+=30;
  if(course.courseKind==="retake")floor+=15;
  return Math.min(210,Math.max(0,floor));
}

function objectiveScore(course:ScenarioCourse,objective:ScenarioObjective,allocated:number,floor:number){
  if(course.postExam)return -Infinity;
  const readiness=course.readinessIndex??50;
  const belowPass=course.band==="at_risk"||course.band==="fragile"||course.band==="insufficient_evidence";
  const belowTarget=readiness<80;
  const runway=({unknown:0,ample:0,workable:7,compressed:18,urgent:32,passed:-100} as Record<RunwayBand,number>)[course.runway];
  const trend=course.trajectory==="declining"?14:course.trajectory==="improving"?-3:0;
  const credits=8*(creditWeight(course.credits)-1);
  const floorNeed=allocated<floor?26:0;
  const action=course.actionValue*0.15;
  const priority=course.decisionPriority*0.42;
  let objectiveTerm=0;

  if(objective==="protect_passes"){
    objectiveTerm=belowPass?34:course.band==="pass_ready"?12:-6;
  }else if(objective==="exam_period"){
    objectiveTerm=(course.runway==="urgent"?36:course.runway==="compressed"?28:course.runway==="workable"?12:0)+(belowPass?24:course.band==="pass_ready"?10:0);
  }else if(objective==="target_performance"){
    if(belowPass)objectiveTerm=24;
    else if(belowTarget)objectiveTerm=30-Math.abs(80-readiness)*0.5;
    else objectiveTerm=readiness<90?10:-8;
  }else{
    objectiveTerm=belowPass?24:belowTarget?16:4;
  }

  // Each extra 15-minute block becomes less attractive. The penalty starts
  // only after the protection floor so mandatory recovery is not treated as diminishing-return work.
  const excess=Math.max(0,allocated-floor);
  const diminishing=excess/15*4.5;
  return priority+action+runway+trend+credits+floorNeed+objectiveTerm-diminishing;
}

function reasonFor(course:ScenarioCourse,objective:ScenarioObjective,floor:number){
  const parts:string[]=[];
  if(course.band==="at_risk"||course.band==="fragile")parts.push("protect pass readiness");
  else if(course.band==="insufficient_evidence")parts.push("close evidence uncertainty");
  else if(objective==="exam_period"&&(course.runway==="urgent"||course.runway==="compressed"))parts.push("protect the nearest exam");
  else if(objective==="target_performance"&&(course.readinessIndex??0)<80)parts.push("close the 80+ readiness gap");
  else parts.push("maintain current readiness");
  if(course.runway==="urgent"||course.runway==="compressed")parts.push(course.runway+" exam runway");
  if(course.trajectory==="declining")parts.push("declining trajectory");
  if(course.credits&&course.credits>=9)parts.push("high-credit course");
  parts.push(floor+" min protection floor");
  return parts.join(" · ");
}

export function courseFromForecast(forecast:CourseForecast):ScenarioCourse{
  return {
    courseId:forecast.courseId,displayName:forecast.displayName,shortName:forecast.shortName,courseKind:forecast.courseKind,
    credits:forecast.credits,readinessIndex:forecast.readinessIndex,band:forecast.band,confidence:forecast.confidence,
    trajectory:forecast.trajectory,runway:forecast.runway,decisionPriority:forecast.decisionPriority,
    actionValue:forecast.nextAction.expectedValue,actionTitle:forecast.nextAction.title,
    actionMinutes:forecast.nextAction.estimatedMinutes,
    postExam:forecast.runway==="passed"||forecast.decisionPriority===0,
  };
}

export function buildScenario(input:ScenarioInput):ScenarioPlan{
  const weekly=Math.max(0,Math.floor(input.weeklyCapacityMinutes));
  const mandatoryDemand=Math.max(0,Math.floor(input.mandatoryCommitmentMinutes));
  const mandatory=Math.max(0,Math.min(weekly,mandatoryDemand));
  const mandatoryShortfall=Math.max(0,mandatoryDemand-mandatory);
  const afterMandatory=Math.max(0,weekly-mandatory);
  const retention=Math.max(0,Math.min(afterMandatory,Math.floor(input.retentionReserveMinutes)));
  const allocatable=Math.max(0,weekly-mandatory-retention);
  const active=input.courses.filter((course)=>!course.postExam);
  const floors=new Map(active.map((course)=>[course.courseId,protectionFloor(course)]));
  const totalFloor=[...floors.values()].reduce((sum,n)=>sum+n,0);
  const allocations=new Map(active.map((course)=>[course.courseId,0]));
  const chunk=15;
  let remaining=allocatable;

  // First pass: protect each course floor. If impossible, each chunk goes to the
  // course with the highest marginal protection value; unmet floors remain explicit.
  while(remaining>=chunk&&active.some((course)=>(allocations.get(course.courseId)??0)<(floors.get(course.courseId)??0))){
    const ranked=[...active].sort((a,b)=>{
      const aAllocated=allocations.get(a.courseId)??0,bAllocated=allocations.get(b.courseId)??0;
      const aScore=objectiveScore(a,input.objective,aAllocated,floors.get(a.courseId)??0);
      const bScore=objectiveScore(b,input.objective,bAllocated,floors.get(b.courseId)??0);
      return bScore-aScore||b.decisionPriority-a.decisionPriority||a.courseId.localeCompare(b.courseId);
    });
    const next=ranked.find((course)=>(allocations.get(course.courseId)??0)<(floors.get(course.courseId)??0));
    if(!next)break;
    allocations.set(next.courseId,(allocations.get(next.courseId)??0)+chunk);
    remaining-=chunk;
  }

  // Second pass: distribute discretionary capacity by marginal value with diminishing returns.
  while(remaining>=chunk&&active.length){
    const ranked=[...active].sort((a,b)=>{
      const aScore=objectiveScore(a,input.objective,allocations.get(a.courseId)??0,floors.get(a.courseId)??0);
      const bScore=objectiveScore(b,input.objective,allocations.get(b.courseId)??0,floors.get(b.courseId)??0);
      return bScore-aScore||b.decisionPriority-a.decisionPriority||a.courseId.localeCompare(b.courseId);
    });
    const next=ranked[0];
    const nextScore=objectiveScore(next,input.objective,allocations.get(next.courseId)??0,floors.get(next.courseId)??0);
    if(!Number.isFinite(nextScore))break;
    allocations.set(next.courseId,(allocations.get(next.courseId)??0)+chunk);
    remaining-=chunk;
  }

  // Keep a final sub-15-minute remainder unused instead of pretending it is a meaningful block.
  const rows=active.map((course)=>{
    const allocated=allocations.get(course.courseId)??0;
    const floor=floors.get(course.courseId)??0;
    const shortfall=Math.max(0,floor-allocated);
    return {
      courseId:course.courseId,displayName:course.displayName,shortName:course.shortName,courseKind:course.courseKind,
      allocatedMinutes:allocated,protectionFloorMinutes:floor,floorMet:shortfall===0,floorShortfallMinutes:shortfall,
      sharePercent:allocatable?Math.round(allocated/allocatable*100):0,
      marginalScore:Math.round(clamp(objectiveScore(course,input.objective,allocated,floor))),
      reason:reasonFor(course,input.objective,floor),sacrificeRank:null,
      readinessIndex:course.readinessIndex,band:course.band,runway:course.runway,actionTitle:course.actionTitle,
    } satisfies CourseAllocation;
  });

  const sacrificed=[...rows].filter((row)=>!row.floorMet).sort((a,b)=>b.floorShortfallMinutes-a.floorShortfallMinutes||a.marginalScore-b.marginalScore);
  sacrificed.forEach((row,index)=>{row.sacrificeRank=index+1;});
  const totalFloorShortfall=sacrificed.reduce((sum,row)=>sum+row.floorShortfallMinutes,0);
  const allocatedCourseMinutes=rows.reduce((sum,row)=>sum+row.allocatedMinutes,0);
  const feasibleProtection=mandatoryShortfall===0&&totalFloorShortfall===0;
  const summary=mandatoryShortfall>0
    ?"Mandatory commitments alone exceed weekly capacity by "+mandatoryShortfall+" minutes. No course-allocation scenario can be feasible until capacity rises or a commitment changes."
    :feasibleProtection
    ?input.objective==="protect_passes"
      ?"All course protection floors fit. Remaining capacity is concentrated where pass-readiness risk has the highest marginal value."
      :input.objective==="target_performance"
        ?"All course protection floors fit. Remaining capacity is tilted toward courses where extra work can most efficiently close the 80+ readiness gap."
        :input.objective==="exam_period"
          ?"All course protection floors fit. Remaining capacity is tilted toward the nearest exams while still protecting weak courses and diminishing returns."
          :"All course protection floors fit. Remaining capacity is balanced by readiness gap, exam runway, trajectory, credits, and diminishing returns."
    :"Weekly capacity is insufficient to satisfy every course protection floor. Shortfalls are shown explicitly; the scenario does not overbook the week.";

  return {
    objective:input.objective,weeklyCapacityMinutes:weekly,mandatoryCommitmentMinutes:mandatory,
    mandatoryDemandMinutes:mandatoryDemand,mandatoryShortfallMinutes:mandatoryShortfall,
    retentionReserveMinutes:retention,allocatableCourseMinutes:allocatable,allocatedCourseMinutes,
    unusedMinutes:Math.max(0,weekly-mandatory-retention-allocatedCourseMinutes),
    feasibleProtection,totalProtectionFloorMinutes:totalFloor,totalFloorShortfallMinutes:totalFloorShortfall,
    allocations:rows.sort((a,b)=>b.allocatedMinutes-a.allocatedMinutes||b.marginalScore-a.marginalScore),
    sacrificedCourses:sacrificed.length,summary,
  };
}

export function buildStandardScenarios(input:Omit<ScenarioInput,"objective">){
  return {
    protectPasses:buildScenario({...input,objective:"protect_passes"}),
    balanced:buildScenario({...input,objective:"balanced"}),
    targetPerformance:buildScenario({...input,objective:"target_performance"}),
    examPeriod:buildScenario({...input,objective:"exam_period"}),
  };
}
