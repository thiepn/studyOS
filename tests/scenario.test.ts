import test from "node:test";
import assert from "node:assert/strict";
import { buildScenario, buildStandardScenarios, protectionFloor, type ScenarioCourse } from "../src/lib/study/scenario.ts";

const course=(id:string,overrides:Partial<ScenarioCourse>={}):ScenarioCourse=>({
  courseId:id,displayName:id.toUpperCase(),shortName:id.toUpperCase(),courseKind:"major",credits:9,
  readinessIndex:70,band:"pass_ready",confidence:"medium",trajectory:"stable",runway:"workable",
  decisionPriority:55,actionValue:80,actionTitle:"Work",actionMinutes:30,postExam:false,...overrides,
});

test("scenario never exceeds fixed weekly capacity",()=>{
  const result=buildScenario({
    weeklyCapacityMinutes:600,mandatoryCommitmentMinutes:90,retentionReserveMinutes:120,objective:"balanced",
    courses:[course("dgl"),course("stoch"),course("ti"),course("amp")],
  });
  assert.ok(result.mandatoryCommitmentMinutes+result.retentionReserveMinutes+result.allocatedCourseMinutes<=600);
  assert.ok(result.unusedMinutes<15);
});

test("infeasible protection is explicit instead of overbooking",()=>{
  const result=buildScenario({
    weeklyCapacityMinutes:180,mandatoryCommitmentMinutes:30,retentionReserveMinutes:30,objective:"protect_passes",
    courses:[
      course("a",{band:"at_risk",readinessIndex:40,runway:"compressed"}),
      course("b",{band:"fragile",readinessIndex:58,runway:"compressed"}),
      course("c",{band:"at_risk",readinessIndex:45,runway:"workable"}),
    ],
  });
  assert.equal(result.feasibleProtection,false);
  assert.ok(result.totalFloorShortfallMinutes>0);
  assert.ok(result.sacrificedCourses>0);
  assert.ok(result.allocations.some((row)=>row.sacrificeRank!=null));
});

test("urgent at-risk course receives a larger protection floor",()=>{
  const calm=protectionFloor(course("a",{band:"at_risk",runway:"ample"}));
  const urgent=protectionFloor(course("a",{band:"at_risk",runway:"urgent"}));
  assert.ok(urgent>calm);
});

test("post-exam course receives no allocation",()=>{
  const result=buildScenario({
    weeklyCapacityMinutes:300,mandatoryCommitmentMinutes:0,retentionReserveMinutes:60,objective:"balanced",
    courses:[course("done",{postExam:true,runway:"passed",decisionPriority:0}),course("active")],
  });
  assert.equal(result.allocations.some((row)=>row.courseId==="done"),false);
  assert.equal(result.allocations.find((row)=>row.courseId==="active")?.allocatedMinutes,240);
});

test("protect-pass objective favors weak course over already strong course",()=>{
  const result=buildScenario({
    weeklyCapacityMinutes:240,mandatoryCommitmentMinutes:0,retentionReserveMinutes:0,objective:"protect_passes",
    courses:[
      course("weak",{band:"at_risk",readinessIndex:42,decisionPriority:82,runway:"compressed"}),
      course("strong",{band:"strong",readinessIndex:93,decisionPriority:20,runway:"ample"}),
    ],
  });
  const weak=result.allocations.find((row)=>row.courseId==="weak")!;
  const strong=result.allocations.find((row)=>row.courseId==="strong")!;
  assert.ok(weak.allocatedMinutes>strong.allocatedMinutes);
});

test("diminishing returns prevents one course from swallowing a roomy balanced week",()=>{
  const result=buildScenario({
    weeklyCapacityMinutes:600,mandatoryCommitmentMinutes:0,retentionReserveMinutes:0,objective:"balanced",
    courses:[
      course("a",{decisionPriority:80,band:"fragile",readinessIndex:60}),
      course("b",{decisionPriority:68,band:"pass_ready",readinessIndex:72}),
      course("c",{decisionPriority:60,band:"pass_ready",readinessIndex:75}),
    ],
  });
  assert.ok(result.allocations.every((row)=>row.allocatedMinutes>0));
  assert.ok(Math.max(...result.allocations.map((row)=>row.sharePercent))<70);
});

test("standard scenarios preserve exactly the same fixed capacity",()=>{
  const plans=buildStandardScenarios({
    weeklyCapacityMinutes:720,mandatoryCommitmentMinutes:120,retentionReserveMinutes:150,
    courses:[course("a"),course("b"),course("c")],
  });
  for(const plan of Object.values(plans))assert.equal(plan.weeklyCapacityMinutes,720);
});


test("exam-period objective shifts discretionary capacity toward compressed runway",()=>{
  const result=buildScenario({
    weeklyCapacityMinutes:420,mandatoryCommitmentMinutes:0,retentionReserveMinutes:60,objective:"exam_period",
    courses:[
      course("near",{runway:"compressed",decisionPriority:60,band:"pass_ready",readinessIndex:72}),
      course("far",{runway:"ample",decisionPriority:60,band:"pass_ready",readinessIndex:72}),
    ],
  });
  const near=result.allocations.find((row)=>row.courseId==="near")!;
  const far=result.allocations.find((row)=>row.courseId==="far")!;
  assert.ok(near.allocatedMinutes>far.allocatedMinutes);
});


test("mandatory commitments exceeding capacity are surfaced as a separate infeasibility",()=>{
  const result=buildScenario({
    weeklyCapacityMinutes:120,mandatoryCommitmentMinutes:180,retentionReserveMinutes:30,objective:"balanced",
    courses:[course("a",{band:"at_risk",readinessIndex:45})],
  });
  assert.equal(result.mandatoryCommitmentMinutes,120);
  assert.equal(result.mandatoryDemandMinutes,180);
  assert.equal(result.mandatoryShortfallMinutes,60);
  assert.equal(result.allocatableCourseMinutes,0);
  assert.equal(result.feasibleProtection,false);
  assert.match(result.summary,/Mandatory commitments alone exceed/i);
});
