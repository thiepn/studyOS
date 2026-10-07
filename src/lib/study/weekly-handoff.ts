import type { ScenarioCourse, ScenarioObjective } from "./scenario.ts";
import type { WeeklyProgress } from "./weekly-plan.ts";
import type { WeeklyCalibrationProfile } from "./weekly-calibration.ts";

export type HandoffCourseReview={
  courseId:string;
  displayName:string;
  shortName:string|null;
  targetMinutes:number;
  creditedMinutes:number;
  droppedEnvelopeMinutes:number;
  overageMinutes:number;
  adherencePercent:number;
  priorReadinessIndex:number|null;
  currentReadinessIndex:number|null;
  readinessDelta:number|null;
  floorAdjustmentMinutes:number;
  sacrificed:boolean;
};

export type WeekReviewSummary={
  targetMinutes:number;
  creditedMinutes:number;
  adherencePercent:number;
  droppedEnvelopeMinutes:number;
  overageMinutes:number;
  courses:HandoffCourseReview[];
};

export type HandoffCapacity={
  feasibleCapacityMinutes:number;
  selectedCapacityMinutes:number;
  mandatoryMinutes:number;
  retentionMinutes:number;
  courseBudgetMinutes:number;
  calibrationApplied:boolean;
  calibrationNote:string;
};

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const round15=(n:number)=>Math.max(0,Math.round(n/15)*15);
function dayNumber(date:string){return Math.floor(Date.parse(date+"T00:00:00Z")/86_400_000);}

export function addDays(date:string,days:number){
  const d=new Date(date+"T12:00:00Z");
  d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}

export function mondayOnOrAfter(date:string){
  const weekday=new Date(date+"T12:00:00Z").getUTCDay();
  const delta=weekday===1?0:(8-weekday)%7;
  return addDays(date,delta);
}

export function buildWeekReview(input:{
  progress:WeeklyProgress;
  priorReadiness:Record<string,number|null>;
  currentCourses:ScenarioCourse[];
  floorAdjustments:Record<string,number>;
}):WeekReviewSummary{
  const currentMap=new Map(input.currentCourses.map(course=>[course.courseId,course]));
  const courses=input.progress.courses.map(course=>{
    const current=currentMap.get(course.courseId);
    const prior=input.priorReadiness[course.courseId]??null;
    const now=current?.readinessIndex??null;
    const delta=prior==null||now==null?null:now-prior;
    const dropped=Math.max(0,course.targetMinutes-course.completedMinutes);
    const overage=Math.max(0,course.completedMinutes-course.targetMinutes);
    const adherence=course.targetMinutes>0
      ?Math.round(clamp(course.completedMinutes/course.targetMinutes*100,0,150))
      :100;
    return {
      courseId:course.courseId,displayName:course.displayName,shortName:course.shortName,
      targetMinutes:course.targetMinutes,creditedMinutes:course.completedMinutes,
      droppedEnvelopeMinutes:dropped,overageMinutes:overage,adherencePercent:adherence,
      priorReadinessIndex:prior,currentReadinessIndex:now,readinessDelta:delta,
      floorAdjustmentMinutes:Number(input.floorAdjustments[course.courseId]??0),
      sacrificed:course.originalMinutes<course.protectionFloorMinutes||course.targetMinutes<course.protectionFloorMinutes,
    };
  });
  const target=courses.reduce((sum,row)=>sum+row.targetMinutes,0);
  const credited=courses.reduce((sum,row)=>sum+row.creditedMinutes,0);
  return {
    targetMinutes:target,creditedMinutes:credited,
    adherencePercent:target?Math.round(clamp(credited/target*100,0,150)):100,
    droppedEnvelopeMinutes:courses.reduce((sum,row)=>sum+row.droppedEnvelopeMinutes,0),
    overageMinutes:courses.reduce((sum,row)=>sum+row.overageMinutes,0),
    courses,
  };
}

export function recommendHandoffObjective(input:{
  courses:ScenarioCourse[];
  review:WeekReviewSummary|null;
}):{objective:ScenarioObjective;reason:string}{
  const active=input.courses.filter(course=>!course.postExam);
  const examPressure=active.filter(course=>course.runway==="urgent"||course.runway==="compressed");
  if(examPressure.some(course=>course.decisionPriority>=35)){
    return {objective:"exam_period",reason:"At least one active course has compressed/urgent exam runway and material semester priority."};
  }
  const weak=active.filter(course=>course.band==="at_risk"||course.band==="fragile");
  const sacrificed=input.review?.courses.filter(course=>course.sacrificed).length??0;
  if(weak.length||sacrificed){
    return {objective:"protect_passes",reason:weak.length
      ?weak.length+" course"+(weak.length===1?" is":"s are")+" below pass-ready."
      :sacrificed+" course"+(sacrificed===1?" was":"s were")+" below its protection floor last week."};
  }
  const belowTarget=active.filter(course=>course.readinessIndex!=null&&course.readinessIndex<80);
  if(belowTarget.length){
    return {objective:"target_performance",reason:"Pass protection is stable enough to focus discretionary time on the 80+ readiness target."};
  }
  return {objective:"balanced",reason:"No exam-pressure, pass-protection, or target-gap exception currently dominates the next week."};
}

export function deriveHandoffCapacity(input:{
  feasibleCapacityMinutes:number;
  mandatoryMinutes:number;
  reviewRatio:number;
  maxRetentionMinutes:number;
  calibration:WeeklyCalibrationProfile;
}):HandoffCapacity{
  const feasible=Math.max(0,Math.floor(input.feasibleCapacityMinutes));
  const mandatory=Math.max(0,Math.floor(input.mandatoryMinutes));
  const boundedMandatory=Math.min(feasible,mandatory);
  const afterMandatory=Math.max(0,feasible-boundedMandatory);
  const baselineRetention=round15(Math.min(input.maxRetentionMinutes,afterMandatory*clamp(input.reviewRatio,0,0.5)));
  const baselineCourse=Math.max(0,feasible-boundedMandatory-baselineRetention);

  let selected=feasible;
  let calibrationApplied=false;
  let note=input.calibration.capacityRecommendation;

  // P20's negative capacity recommendation may safely create a smaller weekly trial.
  // Positive advice stays advisory because P20 is not allowed to expand the P10 ceiling.
  if(input.calibration.capacitySignal==="commitment_too_high"&&input.calibration.completedWeeks>=3){
    const reducedCourse=round15(baselineCourse*0.9);
    selected=Math.max(boundedMandatory+baselineRetention,boundedMandatory+baselineRetention+reducedCourse);
    calibrationApplied=selected<feasible;
    note=calibrationApplied
      ?"Execution evidence supports a conservative next-week trial: the course-work envelope is reduced by about 10% without changing daily capacity."
      :input.calibration.capacityRecommendation;
  }else if(input.calibration.capacitySignal==="commitment_too_low"){
    note="Execution evidence suggests that more course capacity may be realistic, but the next-week plan does not exceed the current daily/calendar ceiling automatically.";
  }

  const afterSelectedMandatory=Math.max(0,selected-Math.min(selected,mandatory));
  const retention=calibrationApplied
    ?baselineRetention
    :round15(Math.min(input.maxRetentionMinutes,afterSelectedMandatory*clamp(input.reviewRatio,0,0.5)));
  return {
    feasibleCapacityMinutes:feasible,selectedCapacityMinutes:selected,mandatoryMinutes:mandatory,
    retentionMinutes:retention,courseBudgetMinutes:Math.max(0,selected-Math.min(selected,mandatory)-retention),
    calibrationApplied,calibrationNote:note,
  };
}

export function isWeekClosable(periodEndsOn:string,today:string){
  return dayNumber(periodEndsOn)<dayNumber(today);
}

export function isHandoffCommitWindow(today:string,targetStart:string){
  const daysUntil=dayNumber(targetStart)-dayNumber(today);
  return daysUntil===0||daysUntil===1;
}

export function canCommitHandoff(input:{
  today:string;
  targetStart:string;
  previousStatus:string|null;
  targetStatus:string|null;
}){
  if(!isHandoffCommitWindow(input.today,input.targetStart))return false;
  if(input.previousStatus&&input.previousStatus!=="completed")return false;
  if(input.targetStatus&&input.targetStatus!=="cancelled")return false;
  return true;
}
