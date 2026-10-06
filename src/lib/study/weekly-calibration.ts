export type CalibrationEvidence="insufficient"|"emerging"|"usable"|"established";
export type AllocationSignal="insufficient"|"balanced"|"overallocated"|"underallocated"|"volatile";
export type EstimateSignal="insufficient"|"accurate"|"underestimated"|"overestimated";
export type CapacitySignal="insufficient"|"aligned"|"commitment_too_high"|"commitment_too_low"|"volatile";

export type WeeklyExecutionObservation={
  planId:string;
  periodEndsOn:string;
  courseId:string;
  displayName:string;
  shortName:string|null;
  originalMinutes:number;
  targetMinutes:number;
  protectionFloorMinutes:number;
  creditedMinutes:number;
  snapshotReadinessIndex:number|null;
  weekTargetMinutes:number;
  weekCreditedMinutes:number;
  rebalanced:boolean;
};

export type SessionEstimateSample={
  courseId:string;
  plannedMinutes:number;
  actualMinutes:number;
};

export type CourseAllocationCalibration={
  courseId:string;
  displayName:string;
  shortName:string|null;
  evidence:CalibrationEvidence;
  observedWeeks:number;
  medianAdherencePercent:number|null;
  originalAdherencePercent:number|null;
  overallocatedWeeks:number;
  underallocatedWeeks:number;
  sacrificedWeeks:number;
  rebalancedWeeks:number;
  allocationSignal:AllocationSignal;
  estimateSamples:number;
  medianEstimateRatio:number|null;
  estimateSignal:EstimateSignal;
  floorAdjustmentMinutes:number;
  adjustmentApplied:boolean;
  rationale:string;
};

export type WeekExecutionQuality={
  planId:string;
  periodEndsOn:string;
  targetMinutes:number;
  creditedMinutes:number;
  adherencePercent:number;
  rebalanced:boolean;
  sacrificedCourses:number;
};

export type WeeklyCalibrationProfile={
  completedWeeks:number;
  evidence:CalibrationEvidence;
  medianWeekAdherencePercent:number|null;
  capacitySignal:CapacitySignal;
  capacityRecommendationFactor:number;
  capacityRecommendation:string;
  totalRebalancedWeeks:number;
  totalSacrificeEvents:number;
  courses:CourseAllocationCalibration[];
  weeks:WeekExecutionQuality[];
  floorAdjustments:Record<string,number>;
};

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const round15=(n:number)=>Math.round(n/15)*15;

function median(values:number[]){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
}
function ratioPct(numerator:number,denominator:number){
  if(denominator<=0)return numerator>0?150:100;
  return Math.round(clamp(numerator/denominator*100,0,150));
}
function evidenceBand(weeks:number):CalibrationEvidence{
  if(weeks<2)return "insufficient";
  if(weeks<3)return "emerging";
  if(weeks<5)return "usable";
  return "established";
}
function estimateSignal(samples:number,ratio:number|null):EstimateSignal{
  if(samples<4||ratio==null)return "insufficient";
  if(ratio>=1.2)return "underestimated";
  if(ratio<=0.8)return "overestimated";
  return "accurate";
}

export function buildWeeklyCalibrationProfile(
  observations:WeeklyExecutionObservation[],
  estimateSamples:SessionEstimateSample[],
):WeeklyCalibrationProfile{
  const planIds=[...new Set(observations.map(row=>row.planId))];
  const weeks:WeekExecutionQuality[]=planIds.map(planId=>{
    const rows=observations.filter(row=>row.planId===planId);
    const target=rows[0]?.weekTargetMinutes??rows.reduce((sum,row)=>sum+row.targetMinutes,0);
    const credited=rows[0]?.weekCreditedMinutes??rows.reduce((sum,row)=>sum+Math.min(row.creditedMinutes,row.targetMinutes),0);
    return {
      planId,
      periodEndsOn:rows[0]?.periodEndsOn??"",
      targetMinutes:target,
      creditedMinutes:credited,
      adherencePercent:ratioPct(credited,target),
      rebalanced:rows.some(row=>row.rebalanced),
      sacrificedCourses:rows.filter(row=>row.targetMinutes<row.protectionFloorMinutes).length,
    };
  }).sort((a,b)=>a.periodEndsOn.localeCompare(b.periodEndsOn));

  const courseIds=[...new Set(observations.map(row=>row.courseId))];
  const courses:CourseAllocationCalibration[]=courseIds.map(courseId=>{
    const rows=observations.filter(row=>row.courseId===courseId).sort((a,b)=>a.periodEndsOn.localeCompare(b.periodEndsOn));
    const samples=estimateSamples.filter(sample=>sample.courseId===courseId&&sample.plannedMinutes>0&&sample.actualMinutes>=0);
    const adherence=rows.map(row=>ratioPct(row.creditedMinutes,row.targetMinutes));
    const originalAdherence=rows.map(row=>ratioPct(row.creditedMinutes,row.originalMinutes));
    const estimateRatios=samples.map(sample=>sample.actualMinutes/sample.plannedMinutes).filter(Number.isFinite);
    const medianEstimate=median(estimateRatios);
    const estimate=estimateSignal(samples.length,medianEstimate);

    // A course is only called overallocated when the week as a whole was executed reasonably well.
    // Otherwise the miss is a whole-week capacity problem, not evidence against this course.
    const overallocatedRows=rows.filter(row=>{
      const weekAdherence=ratioPct(row.weekCreditedMinutes,row.weekTargetMinutes);
      const gap=row.targetMinutes-row.creditedMinutes;
      return row.targetMinutes>=45&&weekAdherence>=85&&gap>=Math.max(30,row.targetMinutes*0.25);
    });
    const underallocatedRows=rows.filter(row=>{
      const gap=row.creditedMinutes-row.targetMinutes;
      return row.targetMinutes>=30&&gap>=Math.max(30,row.targetMinutes*0.20);
    });
    const sacrificedRows=rows.filter(row=>row.targetMinutes<row.protectionFloorMinutes);
    const rebalancedRows=rows.filter(row=>row.rebalanced);
    const evidence=evidenceBand(rows.length);

    let allocationSignal:AllocationSignal="insufficient";
    if(rows.length>=3){
      if(overallocatedRows.length>=2&&underallocatedRows.length>=2)allocationSignal="volatile";
      else if(overallocatedRows.length>=2)allocationSignal="overallocated";
      else if(underallocatedRows.length>=2)allocationSignal="underallocated";
      else allocationSignal="balanced";
    }

    let adjustment=0;
    const medianReadiness=median(rows.map(row=>row.snapshotReadinessIndex).filter((value):value is number=>value!=null));
    if(rows.length>=3){
      // Repeated sacrifices are protected first so the same course is not structurally starved.
      if(sacrificedRows.length>=2)adjustment+=15;
      if(allocationSignal==="underallocated")adjustment+=15;
      if(allocationSignal==="underallocated"&&estimate==="underestimated")adjustment+=15;
      // Do not lower protection on weak-readiness courses merely because their weekly target was missed.
      if(allocationSignal==="overallocated"&&sacrificedRows.length===0&&(medianReadiness??0)>=70)adjustment-=15;
      if(allocationSignal==="overallocated"&&estimate==="overestimated"&&(medianReadiness??0)>=80)adjustment-=15;
    }
    adjustment=round15(clamp(adjustment,-30,30));

    let rationale:string;
    if(rows.length<3)rationale="Collect at least three completed weekly commitments before changing this course's protection floor.";
    else if(adjustment>0)rationale="Repeated execution evidence suggests this course is being under-protected or repeatedly sacrificed; future P18 floors receive a bounded increase.";
    else if(adjustment<0)rationale="The rest of the week was generally executed while this course repeatedly received more planned time than was used; a bounded floor reduction is supported.";
    else if(allocationSignal==="volatile")rationale="The course alternates between over- and under-allocation. Keep the current floor until the pattern stabilizes.";
    else rationale="Historical execution is compatible with the current protection floor; no automatic correction is supported.";

    const first=rows[0];
    return {
      courseId,displayName:first?.displayName??"Course",shortName:first?.shortName??null,
      evidence,observedWeeks:rows.length,
      medianAdherencePercent:median(adherence)==null?null:Math.round(median(adherence)!),
      originalAdherencePercent:median(originalAdherence)==null?null:Math.round(median(originalAdherence)!),
      overallocatedWeeks:overallocatedRows.length,underallocatedWeeks:underallocatedRows.length,
      sacrificedWeeks:sacrificedRows.length,rebalancedWeeks:rebalancedRows.length,
      allocationSignal,estimateSamples:samples.length,
      medianEstimateRatio:medianEstimate==null?null:Math.round(medianEstimate*100)/100,
      estimateSignal:estimate,floorAdjustmentMinutes:adjustment,adjustmentApplied:adjustment!==0,
      rationale,
    };
  }).sort((a,b)=>Math.abs(b.floorAdjustmentMinutes)-Math.abs(a.floorAdjustmentMinutes)||b.sacrificedWeeks-a.sacrificedWeeks||a.displayName.localeCompare(b.displayName));

  const completedWeeks=weeks.length;
  const weekMedian=median(weeks.map(week=>week.adherencePercent));
  const lowWeeks=weeks.filter(week=>week.adherencePercent<75).length;
  const highWeeks=weeks.filter(week=>week.adherencePercent>115).length;
  let capacitySignal:CapacitySignal="insufficient";
  let factor=1;
  let recommendation="Collect at least three completed weekly commitments before calibrating overall weekly capacity.";
  if(completedWeeks>=3){
    if(lowWeeks>=2&&highWeeks>=2){
      capacitySignal="volatile";
      recommendation="Weekly execution varies too much to justify changing the default capacity. Keep P10 unchanged and inspect calendar/workload volatility.";
    }else if(lowWeeks>=2&&(weekMedian??100)<80){
      capacitySignal="commitment_too_high";factor=0.9;
      recommendation="Course envelopes are repeatedly under-completed. Test roughly 10% less weekly course capacity before changing the P10 daily default.";
    }else if(highWeeks>=2&&(weekMedian??100)>110){
      capacitySignal="commitment_too_low";factor=1.1;
      recommendation="Course envelopes are repeatedly exceeded. Up to 10% more weekly course capacity may be realistic, but P10 daily capacity should not change automatically.";
    }else{
      capacitySignal="aligned";
      recommendation="Committed course capacity is broadly aligned with actual execution. Keep the current weekly capacity baseline.";
    }
  }

  return {
    completedWeeks,evidence:evidenceBand(completedWeeks),
    medianWeekAdherencePercent:weekMedian==null?null:Math.round(weekMedian),
    capacitySignal,capacityRecommendationFactor:factor,capacityRecommendation:recommendation,
    totalRebalancedWeeks:weeks.filter(week=>week.rebalanced).length,
    totalSacrificeEvents:weeks.reduce((sum,week)=>sum+week.sacrificedCourses,0),
    courses,weeks,
    floorAdjustments:Object.fromEntries(courses.filter(course=>course.floorAdjustmentMinutes!==0).map(course=>[course.courseId,course.floorAdjustmentMinutes])),
  };
}
