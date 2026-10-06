import test from "node:test";
import assert from "node:assert/strict";
import { buildWeeklyCalibrationProfile, type WeeklyExecutionObservation, type SessionEstimateSample } from "../src/lib/study/weekly-calibration.ts";

const obs=(week:number,courseId:string,target:number,credited:number,overrides:Partial<WeeklyExecutionObservation>={}):WeeklyExecutionObservation=>({
  planId:"p"+week,periodEndsOn:"2026-10-"+String(10+week).padStart(2,"0"),courseId,
  displayName:courseId.toUpperCase(),shortName:courseId.toUpperCase(),
  originalMinutes:target,targetMinutes:target,protectionFloorMinutes:60,creditedMinutes:credited,
  snapshotReadinessIndex:75,weekTargetMinutes:240,weekCreditedMinutes:220,rebalanced:false,...overrides,
});
const sample=(courseId:string,planned:number,actual:number):SessionEstimateSample=>({courseId,plannedMinutes:planned,actualMinutes:actual});

test("fewer than three completed weeks never changes a course floor",()=>{
  const profile=buildWeeklyCalibrationProfile([obs(1,"dgl",120,180),obs(2,"dgl",120,180)],[]);
  assert.equal(profile.courses[0].evidence,"emerging");
  assert.equal(profile.courses[0].floorAdjustmentMinutes,0);
  assert.deepEqual(profile.floorAdjustments,{});
});

test("repeated extra work increases protection after sufficient evidence",()=>{
  const observations=[obs(1,"dgl",90,150),obs(2,"dgl",90,150),obs(3,"dgl",90,120)];
  const profile=buildWeeklyCalibrationProfile(observations,[]);
  const dgl=profile.courses[0];
  assert.equal(dgl.allocationSignal,"underallocated");
  assert.equal(dgl.floorAdjustmentMinutes,15);
});

test("underestimated sessions can strengthen an underallocation correction but cap it",()=>{
  const observations=[obs(1,"dgl",90,150),obs(2,"dgl",90,150),obs(3,"dgl",90,135)];
  const estimates=[sample("dgl",60,90),sample("dgl",60,90),sample("dgl",45,70),sample("dgl",30,45)];
  const dgl=buildWeeklyCalibrationProfile(observations,estimates).courses[0];
  assert.equal(dgl.estimateSignal,"underestimated");
  assert.equal(dgl.floorAdjustmentMinutes,30);
});

test("whole-week failure is not misclassified as course-specific overallocation",()=>{
  const observations=[
    obs(1,"ti",120,45,{weekCreditedMinutes:90}),
    obs(2,"ti",120,45,{weekCreditedMinutes:100}),
    obs(3,"ti",120,45,{weekCreditedMinutes:110}),
  ];
  const ti=buildWeeklyCalibrationProfile(observations,[]).courses[0];
  assert.equal(ti.overallocatedWeeks,0);
  assert.equal(ti.floorAdjustmentMinutes,0);
});

test("repeated course-specific overallocation can lower a strong course floor",()=>{
  const observations=[
    obs(1,"ti",120,60,{weekTargetMinutes:240,weekCreditedMinutes:220,snapshotReadinessIndex:82}),
    obs(2,"ti",120,60,{weekTargetMinutes:240,weekCreditedMinutes:230,snapshotReadinessIndex:84}),
    obs(3,"ti",120,105,{weekTargetMinutes:240,weekCreditedMinutes:225,snapshotReadinessIndex:85}),
  ];
  const ti=buildWeeklyCalibrationProfile(observations,[]).courses[0];
  assert.equal(ti.allocationSignal,"overallocated");
  assert.equal(ti.floorAdjustmentMinutes,-15);
});

test("weak readiness prevents lowering protection merely because work was missed",()=>{
  const observations=[
    obs(1,"dgl",120,60,{snapshotReadinessIndex:55}),
    obs(2,"dgl",120,60,{snapshotReadinessIndex:58}),
    obs(3,"dgl",120,90,{snapshotReadinessIndex:60}),
  ];
  const dgl=buildWeeklyCalibrationProfile(observations,[]).courses[0];
  assert.equal(dgl.allocationSignal,"overallocated");
  assert.equal(dgl.floorAdjustmentMinutes,0);
});

test("repeated sacrifice increases protection instead of normalizing starvation",()=>{
  const observations=[
    obs(1,"stoch",45,45,{protectionFloorMinutes:75}),
    obs(2,"stoch",45,45,{protectionFloorMinutes:75}),
    obs(3,"stoch",75,75,{protectionFloorMinutes:75}),
  ];
  const stoch=buildWeeklyCalibrationProfile(observations,[]).courses[0];
  assert.equal(stoch.sacrificedWeeks,2);
  assert.equal(stoch.floorAdjustmentMinutes,15);
});

test("repeated low total adherence creates only an advisory capacity reduction",()=>{
  const observations=[
    obs(1,"a",120,50,{weekTargetMinutes:240,weekCreditedMinutes:120}),
    obs(1,"b",120,70,{weekTargetMinutes:240,weekCreditedMinutes:120}),
    obs(2,"a",120,60,{weekTargetMinutes:240,weekCreditedMinutes:130}),
    obs(2,"b",120,70,{weekTargetMinutes:240,weekCreditedMinutes:130}),
    obs(3,"a",120,90,{weekTargetMinutes:240,weekCreditedMinutes:180}),
    obs(3,"b",120,90,{weekTargetMinutes:240,weekCreditedMinutes:180}),
  ];
  const profile=buildWeeklyCalibrationProfile(observations,[]);
  assert.equal(profile.capacitySignal,"commitment_too_high");
  assert.equal(profile.capacityRecommendationFactor,0.9);
  assert.deepEqual(profile.floorAdjustments,{});
});
