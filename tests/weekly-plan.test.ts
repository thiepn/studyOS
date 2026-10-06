import test from "node:test";
import assert from "node:assert/strict";
import { buildRollingProposal, buildWeeklyProgress, creditedMinutes, weeklyPriorityAdjustment, type WeeklyAllocationSnapshot } from "../src/lib/study/weekly-plan.ts";
import type { ScenarioCourse } from "../src/lib/study/scenario.ts";

const allocation=(id:string,target=120,priority=60):WeeklyAllocationSnapshot=>({
  courseId:id,displayName:id.toUpperCase(),shortName:id.toUpperCase(),originalMinutes:target,targetMinutes:target,
  protectionFloorMinutes:60,snapshotDecisionPriority:priority,actionTitle:"Work",actionHref:"/courses/"+id,actionAuthority:"P17",
});
const course=(id:string,priority=60):ScenarioCourse=>({
  courseId:id,displayName:id.toUpperCase(),shortName:id.toUpperCase(),courseKind:"major",credits:9,
  readinessIndex:70,band:"pass_ready",confidence:"medium",trajectory:"stable",runway:"workable",
  decisionPriority:priority,actionValue:80,actionTitle:"Work",actionHref:"/courses/"+id,actionAuthority:"P17",actionMinutes:30,postExam:false,
});

test("credited minutes use the conservative larger evidence signal rather than summing",()=>{
  assert.equal(creditedMinutes(70,55),70);
  assert.equal(creditedMinutes(25,60),60);
});

test("weekly progress detects behind pace without changing the target",()=>{
  const progress=buildWeeklyProgress({
    periodStartsOn:"2026-10-05",periodEndsOn:"2026-10-11",committedAt:"2026-10-05T08:00:00Z",localToday:"2026-10-08",
    allocations:[allocation("dgl",140)],
    completion:[{courseId:"dgl",sessionMinutes:20,workflowMinutes:0,creditedMinutes:20}],
  });
  assert.equal(progress.courses[0].targetMinutes,140);
  assert.equal(progress.courses[0].paceStatus,"behind");
  assert.equal(progress.courses[0].remainingMinutes,120);
});

test("weekly priority pressure never touches commitments exam strategy or retention",()=>{
  const progress=buildWeeklyProgress({
    periodStartsOn:"2026-10-05",periodEndsOn:"2026-10-11",committedAt:"2026-10-05T08:00:00Z",localToday:"2026-10-08",
    allocations:[allocation("dgl",140)],
    completion:[{courseId:"dgl",sessionMinutes:20,workflowMinutes:0,creditedMinutes:20}],
  }).courses[0];
  assert.equal(weeklyPriorityAdjustment(progress,"commitment"),0);
  assert.equal(weeklyPriorityAdjustment(progress,"exam_strategy"),0);
  assert.equal(weeklyPriorityAdjustment(progress,"review"),0);
  assert.equal(weeklyPriorityAdjustment(progress,"workflow"),10);
});

test("completed envelope reduces discretionary priority",()=>{
  const progress=buildWeeklyProgress({
    periodStartsOn:"2026-10-05",periodEndsOn:"2026-10-11",committedAt:"2026-10-05T08:00:00Z",localToday:"2026-10-06",
    allocations:[allocation("dgl",60)],
    completion:[{courseId:"dgl",sessionMinutes:75,workflowMinutes:0,creditedMinutes:75}],
  }).courses[0];
  assert.equal(progress.paceStatus,"met");
  assert.equal(weeklyPriorityAdjustment(progress,"workflow"),-8);
});

test("rolling proposal shrinks the remaining commitment when capacity is lost",()=>{
  const allocations=[allocation("dgl",180,80),allocation("ti",120,55)];
  const progress=buildWeeklyProgress({
    periodStartsOn:"2026-10-05",periodEndsOn:"2026-10-11",committedAt:"2026-10-05T08:00:00Z",localToday:"2026-10-08",
    allocations,
    completion:[
      {courseId:"dgl",sessionMinutes:60,workflowMinutes:0,creditedMinutes:60},
      {courseId:"ti",sessionMinutes:30,workflowMinutes:0,creditedMinutes:30},
    ],
  });
  const proposal=buildRollingProposal({
    objective:"balanced",committedCourseBudgetMinutes:300,currentRemainingCourseCapacityMinutes:120,
    allocations,completion:[
      {courseId:"dgl",sessionMinutes:60,workflowMinutes:0,creditedMinutes:60},
      {courseId:"ti",sessionMinutes:30,workflowMinutes:0,creditedMinutes:30},
    ],
    currentCourses:[course("dgl",80),course("ti",55)],progress,
  });
  assert.equal(proposal.reason,"capacity_loss");
  assert.equal(proposal.proposedCourseBudgetMinutes,210);
  assert.equal(proposal.courses.reduce((sum,row)=>sum+row.proposedTargetMinutes,0),210);
});

test("material evidence shift can rebalance remaining minutes without increasing the committed budget",()=>{
  const allocations=[allocation("dgl",120,45),allocation("ti",120,45)];
  const completion=[
    {courseId:"dgl",sessionMinutes:30,workflowMinutes:0,creditedMinutes:30},
    {courseId:"ti",sessionMinutes:30,workflowMinutes:0,creditedMinutes:30},
  ];
  const progress=buildWeeklyProgress({
    periodStartsOn:"2026-10-05",periodEndsOn:"2026-10-11",committedAt:"2026-10-05T08:00:00Z",localToday:"2026-10-07",
    allocations,completion,
  });
  const proposal=buildRollingProposal({
    objective:"balanced",committedCourseBudgetMinutes:240,currentRemainingCourseCapacityMinutes:180,
    allocations,completion,currentCourses:[course("dgl",85),course("ti",30)],progress,
  });
  assert.equal(proposal.reason,"evidence_shift");
  assert.equal(proposal.proposedCourseBudgetMinutes,240);
  assert.ok(proposal.courses.find(row=>row.courseId==="dgl")!.proposedTargetMinutes>=proposal.courses.find(row=>row.courseId==="ti")!.proposedTargetMinutes);
});


test("post-exam course releases its unfinished weekly envelope under exam-period rebalance",()=>{
  const allocations=[allocation("dgl",120,80),allocation("ti",120,70)];
  const completion=[
    {courseId:"dgl",sessionMinutes:30,workflowMinutes:0,creditedMinutes:30},
    {courseId:"ti",sessionMinutes:60,workflowMinutes:0,creditedMinutes:60},
  ];
  const progress=buildWeeklyProgress({
    periodStartsOn:"2026-10-05",periodEndsOn:"2026-10-11",committedAt:"2026-10-05T08:00:00Z",localToday:"2026-10-08",
    allocations,completion,
  });
  const closed={...course("dgl",80),postExam:true};
  const active={...course("ti",85),runway:"urgent" as const};
  const proposal=buildRollingProposal({
    objective:"exam_period",committedCourseBudgetMinutes:240,currentRemainingCourseCapacityMinutes:150,
    allocations,completion,currentCourses:[closed,active],progress,
  });
  assert.equal(proposal.courses.find(row=>row.courseId==="dgl")?.proposedTargetMinutes,30);
  assert.ok((proposal.courses.find(row=>row.courseId==="ti")?.proposedTargetMinutes??0)>=60);
  assert.ok(proposal.proposedCourseBudgetMinutes<=240);
});
