import test from "node:test";
import assert from "node:assert/strict";
import { buildDailyPlan, deadlinePressure, type PlanningCandidate } from "../src/lib/study/planner.ts";

function item(id:string, overrides:Partial<PlanningCandidate>={}):PlanningCandidate{
  return {
    id,kind:"workflow",courseId:"c1",courseName:"Course 1",title:id,reason:"test",href:"/courses/c1",
    estimatedMinutes:30,priority:50,splittable:true,allowedInRecovery:true,...overrides,
  };
}

test("planner never exceeds the daily capacity",()=>{
  const plan=buildDailyPlan([
    item("review",{kind:"review",courseId:null,estimatedMinutes:40,priority:90}),
    item("a",{estimatedMinutes:60,priority:80}),
    item("b",{courseId:"c2",estimatedMinutes:60,priority:70}),
  ],{mode:"normal",budgetMinutes:100,maxFocusItems:4});
  assert.equal(plan.usedMinutes,100);
  assert.ok(plan.selected.every((x)=>x.scheduledMinutes>0));
  assert.ok(plan.usedMinutes<=plan.budgetMinutes);
});

test("recovery mode suppresses optional heavy work but keeps urgent deadlines",()=>{
  const plan=buildDailyPlan([
    item("review",{kind:"review",courseId:null,estimatedMinutes:20,priority:90}),
    item("checkpoint",{kind:"checkpoint",heavy:true,allowedInRecovery:false,estimatedMinutes:60,priority:95}),
    item("deadline",{kind:"commitment",courseId:"c2",urgent:true,estimatedMinutes:20,priority:70}),
  ],{mode:"recovery",budgetMinutes:45,maxFocusItems:2});
  assert.deepEqual(plan.selected.map((x)=>x.id),["review","deadline"]);
  assert.equal(plan.deferred.some((x)=>x.id==="checkpoint"),true);
});

test("urgent commitment beats a somewhat higher ordinary priority",()=>{
  const plan=buildDailyPlan([
    item("ordinary",{courseId:"c1",priority:88,estimatedMinutes:30}),
    item("urgent",{kind:"commitment",courseId:"c2",priority:70,urgent:true,estimatedMinutes:30}),
  ],{mode:"normal",budgetMinutes:30,maxFocusItems:1});
  assert.equal(plan.selected[0].id,"urgent");
});

test("course penalty prevents one course monopolizing a balanced plan",()=>{
  const plan=buildDailyPlan([
    item("c1a",{courseId:"c1",priority:90}),
    item("c1b",{courseId:"c1",priority:88}),
    item("c2a",{courseId:"c2",priority:84}),
  ],{mode:"normal",budgetMinutes:60,maxFocusItems:2});
  assert.deepEqual(plan.selected.map((x)=>x.id),["c1a","c2a"]);
});

test("backlog never expands the configured budget",()=>{
  const candidates=Array.from({length:20},(_,i)=>item("x"+i,{courseId:"c"+(i%4),priority:100-i,estimatedMinutes:30}));
  const plan=buildDailyPlan(candidates,{mode:"normal",budgetMinutes:90,maxFocusItems:10});
  assert.equal(plan.usedMinutes,90);
  assert.equal(plan.selected.length,3);
  assert.equal(plan.deferred.length,17);
});

test("deadline pressure is monotonic around urgent windows",()=>{
  const now=new Date("2026-10-05T12:00:00Z");
  assert.equal(deadlinePressure("2026-10-05T11:00:00Z",now).label,"overdue");
  assert.equal(deadlinePressure("2026-10-06T10:00:00Z",now).urgent,true);
  assert.ok(deadlinePressure("2026-10-06T10:00:00Z",now).score>deadlinePressure("2026-10-12T12:00:00Z",now).score);
});
