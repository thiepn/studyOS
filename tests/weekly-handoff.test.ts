import test from "node:test";
import assert from "node:assert/strict";
import { buildWeekReview, deriveHandoffCapacity, isWeekClosable, mondayOnOrAfter, recommendHandoffObjective } from "../src/lib/study/weekly-handoff.ts";
import type { ScenarioCourse } from "../src/lib/study/scenario.ts";
import type { WeeklyCalibrationProfile } from "../src/lib/study/weekly-calibration.ts";
import type { WeeklyProgress } from "../src/lib/study/weekly-plan.ts";

const course=(id:string,overrides:Partial<ScenarioCourse>={}):ScenarioCourse=>({
  courseId:id,displayName:id.toUpperCase(),shortName:id.toUpperCase(),courseKind:"major",credits:9,
  readinessIndex:75,band:"pass_ready",confidence:"medium",trajectory:"stable",runway:"workable",
  decisionPriority:45,actionValue:70,actionTitle:"Work",actionHref:"/courses/"+id,actionAuthority:"P17",
  actionMinutes:30,postExam:false,...overrides,
});

const progress:WeeklyProgress={
  totalTargetMinutes:240,totalCompletedMinutes:180,totalRemainingMinutes:60,completionPercent:75,elapsedFraction:1,
  courses:[
    {courseId:"dgl",displayName:"DGL",shortName:"DGL",originalMinutes:120,targetMinutes:120,protectionFloorMinutes:90,
      snapshotDecisionPriority:60,actionTitle:"Work",actionHref:"/courses/dgl",actionAuthority:"P17",
      completedMinutes:90,remainingMinutes:30,completionPercent:75,expectedMinutesByNow:120,paceStatus:"behind",paceGapMinutes:-30},
    {courseId:"ti",displayName:"TI",shortName:"TI",originalMinutes:90,targetMinutes:120,protectionFloorMinutes:105,
      snapshotDecisionPriority:50,actionTitle:"Work",actionHref:"/courses/ti",actionAuthority:"P17",
      completedMinutes:150,remainingMinutes:0,completionPercent:100,expectedMinutesByNow:120,paceStatus:"met",paceGapMinutes:30},
  ],
};

const calibration=(overrides:Partial<WeeklyCalibrationProfile>={}):WeeklyCalibrationProfile=>({
  completedWeeks:4,evidence:"usable",medianWeekAdherencePercent:78,capacitySignal:"aligned",
  capacityRecommendationFactor:1,capacityRecommendation:"Keep current capacity.",totalRebalancedWeeks:1,totalSacrificeEvents:0,
  courses:[],weeks:[],floorAdjustments:{},...overrides,
});

test("handoff starts today on Monday and otherwise uses the upcoming Monday",()=>{
  assert.equal(mondayOnOrAfter("2026-10-05"),"2026-10-05");
  assert.equal(mondayOnOrAfter("2026-10-06"),"2026-10-12");
  assert.equal(mondayOnOrAfter("2026-10-11"),"2026-10-12");
});

test("unfinished study envelope minutes are reported as dropped rather than carried",()=>{
  const review=buildWeekReview({
    progress,priorReadiness:{dgl:70,ti:75},
    currentCourses:[course("dgl",{readinessIndex:74}),course("ti",{readinessIndex:80})],
    floorAdjustments:{dgl:15},
  });
  assert.equal(review.droppedEnvelopeMinutes,30);
  assert.equal(review.courses.find(row=>row.courseId==="dgl")?.readinessDelta,4);
  assert.equal(review.courses.find(row=>row.courseId==="ti")?.overageMinutes,30);
  assert.equal(review.courses.find(row=>row.courseId==="ti")?.sacrificed,true);
});

test("urgent exam pressure wins the handoff objective",()=>{
  const result=recommendHandoffObjective({
    courses:[course("dgl",{runway:"urgent",decisionPriority:50}),course("ti")],review:null,
  });
  assert.equal(result.objective,"exam_period");
});

test("weak or repeatedly sacrificed courses move handoff to pass protection",()=>{
  assert.equal(recommendHandoffObjective({
    courses:[course("dgl",{band:"fragile"})],review:null,
  }).objective,"protect_passes");
  const review=buildWeekReview({progress,priorReadiness:{},currentCourses:[course("dgl"),course("ti")],floorAdjustments:{}});
  assert.equal(recommendHandoffObjective({courses:[course("dgl"),course("ti")],review}).objective,"protect_passes");
});

test("P20 low-adherence signal may reduce next-week envelope but never expand the ceiling",()=>{
  const lower=deriveHandoffCapacity({
    feasibleCapacityMinutes:840,mandatoryMinutes:120,reviewRatio:1/3,maxRetentionMinutes:280,
    calibration:calibration({capacitySignal:"commitment_too_high",capacityRecommendationFactor:0.9}),
  });
  assert.ok(lower.selectedCapacityMinutes<840);
  assert.ok(lower.selectedCapacityMinutes>=lower.mandatoryMinutes+lower.retentionMinutes);

  const higher=deriveHandoffCapacity({
    feasibleCapacityMinutes:840,mandatoryMinutes:120,reviewRatio:1/3,maxRetentionMinutes:280,
    calibration:calibration({capacitySignal:"commitment_too_low",capacityRecommendationFactor:1.1}),
  });
  assert.equal(higher.selectedCapacityMinutes,840);
});

test("Sunday plan cannot be closed before its calendar week actually ends",()=>{
  assert.equal(isWeekClosable("2026-10-11","2026-10-11"),false);
  assert.equal(isWeekClosable("2026-10-11","2026-10-12"),true);
});
