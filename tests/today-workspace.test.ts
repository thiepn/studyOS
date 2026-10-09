import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildTodayOverview} from "../src/lib/study/today-overview.ts";
import type {DailyPlan,PlannedItem} from "../src/lib/study/planner.ts";
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
const item=(id:string,kind:PlannedItem["kind"],minutes:number,extra:Partial<PlannedItem>={}):PlannedItem=>({id,kind,title:id,reason:"Evidence",href:"/courses/c1",courseId:"c1",courseName:"Analysis",estimatedMinutes:minutes,scheduledMinutes:minutes,priority:70,partial:false,...extra});
test("overview reflects plan order and minute budgets without mutation",()=>{
  const plan:DailyPlan={mode:"normal",budgetMinutes:120,usedMinutes:90,remainingMinutes:30,selected:[
    item("review","review",30,{courseName:null,courseId:null}),item("work","workflow",40),
    item("exam","exam_strategy",20,{urgent:true,courseName:"Stochastik"})],deferred:[]};
  const untouched=structuredClone(plan);
  const v=buildTodayOverview(plan,75,[{due_at:"2026-10-10T11:00:00Z"},{due_at:"2026-10-11T08:00:00Z"},{due_at:"2026-10-15T00:00:00Z"}],new Date("2026-10-10T12:00:00Z"));
  assert.deepEqual(plan,untouched);
  assert.deepEqual([v.plannedMinutes,v.budgetMinutes,v.freeMinutes],[90,120,30]);
  assert.equal(v.reviewDueMinutes,75);assert.equal(v.reviewScheduledMinutes,30);
  assert.equal(v.focusItems,2);assert.equal(v.urgentPlannedItems,1);
  assert.deepEqual([v.overdueCommitments,v.dueSoonCommitments],[1,1]);
  assert.deepEqual(v.focusCourses,["Analysis","Stochastik"]);
});
test("empty/invalid deadlines and recovery days are safe",()=>{
  const v=buildTodayOverview({mode:"recovery",budgetMinutes:45,usedMinutes:0,remainingMinutes:45,selected:[],deferred:[]},-2,[{due_at:"bad"}],new Date("2026-10-10T12:00:00Z"));
  assert.equal(v.reviewDueMinutes,0);assert.equal(v.dueSoonCommitments,0);assert.equal(v.overdueCommitments,0);
});
test("Today shortcuts, landmark labels, modes, and mobile targets are accessible",()=>{
  const p=read("../src/app/page.tsx"),c=read("../src/components/today-overview.tsx"),d=read("../src/components/daily-plan.tsx"),m=read("../src/components/capacity-controls.tsx"),css=read("../src/app/today-workspace.css");
  for(const token of ['id="today-decisions"','id="today-schedule"','id="today-adjust"'])assert.ok(p.includes(token),token);
  assert.match(p,/buildTodayOverview\(plan,data\.queueMinutes,commitments,new Date\(\)\)/);
  assert.match(c,/aria-labelledby="today-overview-heading"/);
  assert.match(c,/<dl className="today-overview-facts">/);
  assert.match(c,/href="#today-sequence-title"/);
  assert.match(d,/aria-label="Upcoming study tasks"/);
  assert.match(m,/aria-pressed=\{selected\}/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/@media\(forced-colors:active\)/);
  assert.doesNotMatch(css,/gradient\(/);
});
