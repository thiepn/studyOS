import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveFirstUseActions,hasRecentCalendarEvidence } from "../src/lib/study/first-use-actions.ts";
import { matchingFirstSemester } from "../src/lib/study/initial-semester-retry.ts";

const now=Date.parse("2026-10-10T19:00:00Z");
const base={
  courseCount:1,majorCourses:[{id:"c1",name:"Analysis III"}],
  proofs:[{courseId:"c1",verifiedResources:1,sourceLinkedQuestions:1,independentAttempts:1}],
  driveConnected:true,driveTreeReady:true,calendarConnected:true,
  calendarLastSyncAt:"2026-10-10T18:30:00Z",calendarLastSyncStatus:"ok",calendarLastError:null,
} as const;

test("authentic sourced learning evidence returns an actionable but non-certifying guide",()=>{
  const x=deriveFirstUseActions(base,now);
  assert.equal(x.completed,x.total);
  assert.equal(x.next,null);
  assert.equal(x.total,6);
  assert.ok(x.actions.every(a=>a.state==="recorded"));
});
test("first-use status rejects missing real roster and ignores unrelated proof rows",()=>{
  const x=deriveFirstUseActions({...base,courseCount:0,majorCourses:[],proofs:base.proofs},now);
  assert.equal(x.actions.find(s=>s.id==="roster")?.state,"pending");
  assert.equal(x.actions.find(s=>s.id==="major")?.state,"pending");
  assert.equal(x.actions.some(s=>s.id==="attempt:c1"),false);
});
test("source, mapping and independent attempt are three distinct sequential gates",()=>{
  const cases=[
    {verifiedResources:0,sourceLinkedQuestions:4,independentAttempts:6,expected:["pending","pending","pending"]},
    {verifiedResources:1,sourceLinkedQuestions:0,independentAttempts:1,expected:["recorded","pending","pending"]},
    {verifiedResources:1,sourceLinkedQuestions:2,independentAttempts:0,expected:["recorded","recorded","pending"]},
  ];
  for(const c of cases){
    const x=deriveFirstUseActions({...base,proofs:[{courseId:"c1",...c}]},now);
    assert.deepEqual(x.actions.slice(-3).map(s=>s.state),c.expected);
  }
});
test("multiple courses cannot inherit another course's Week-1 evidence",()=>{
  const x=deriveFirstUseActions({...base,majorCourses:[...base.majorCourses,{id:"c2",name:"Stochastik"}],
    proofs:[...base.proofs,{courseId:"foreign",verifiedResources:1,sourceLinkedQuestions:1,independentAttempts:1}]},now);
  assert.equal(x.actions.find(s=>s.id==="attempt:c2")?.state,"pending");
  assert.equal(x.actions.find(s=>s.id==="attempt:foreign"),undefined);
});
test("Calendar requires fresh, successful StudyOS evidence not simply connected state",()=>{
  assert.equal(hasRecentCalendarEvidence(base,now),true);
  for(const patch of [
    {calendarConnected:false},{calendarLastSyncStatus:"error"},{calendarLastError:"denied"},
    {calendarLastSyncAt:"2026-10-10T12:59:59Z"},
    {calendarLastSyncAt:"2026-10-10T19:00:01Z"},
    {calendarLastSyncAt:"invalid"},{calendarLastSyncAt:null},
  ]){
    assert.equal(hasRecentCalendarEvidence({...base,...patch},now),false);
  }
});
test("first-semester retry recovers only the same exact owner-scoped semester",()=>{
  const existing={id:"semester-id",stable_key:"wintersemester_2026_27",display_name:"Wintersemester 2026/27",
    starts_on:"2026-10-01",ends_on:"2027-03-31",timezone:"Europe/Berlin"};
  const request={stableKey:existing.stable_key,displayName:existing.display_name,
    startsOn:existing.starts_on,endsOn:existing.ends_on,timezone:existing.timezone};
  assert.equal(matchingFirstSemester(existing,request),existing.id);
  assert.equal(matchingFirstSemester(null,request),null);
  for(const changed of [{endsOn:"2027-03-30"},{timezone:"Europe/London"},{displayName:"Another semester"},
    {startsOn:"2026-10-02"},{stableKey:"another"}]){
    assert.equal(matchingFirstSemester(existing,{...request,...changed}),null);
  }
});
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
test("API enforces review, invalid JSON and duplicate course conflicts with actionable statuses",()=>{
  const cert=read("../src/app/api/study/semester-bootstrap/certify/route.ts");
  const controls=read("../src/components/semester-bootstrap-controls.tsx");
  const initial=read("../src/app/api/study/semester-bootstrap/semester/route.ts");
  const course=read("../src/app/api/study/semester-bootstrap/course/route.ts");
  assert.match(cert,/reviewed!==true/);
  assert.match(controls,/JSON\.stringify\(\{reviewed:true\}\)/);
  assert.match(initial,/initial_semester_conflict"\?409/);
  assert.match(course,/course_already_exists"\?409/);
  assert.match(initial,/Invalid semester JSON/);
  assert.match(course,/Invalid course JSON/);
});
test("semester retry and course preflight require explicit user and semester scope",()=>{
  const db=read("../src/lib/study/semester-bootstrap-data.ts");
  const bootstrap=read("../src/lib/study/bootstrap.ts");
  assert.match(db,/\.eq\("user_id",state\.userId\)\.eq\("active",true\)/);
  assert.match(db,/\.eq\("user_id",userId\)\.eq\("semester_id",semesterId\)\.eq\("stable_key",input\.stableKey\)/);
  assert.match(bootstrap,/\.eq\("user_id",userId\)\.eq\("active",true\)/);
  assert.match(db,/if\(error\.code==="23505"\)/);
});
test("read-only first-use UI derives evidence from the authenticated activation view",()=>{
  const setup=read("../src/app/setup/page.tsx");
  assert.match(setup,/deriveFirstUseActions\(/);
  assert.match(setup,/getActivationData\(\)/);
  assert.match(setup,/firstWeekProof/);
  assert.match(setup,/Manual acceptance pending|first-use evidence/);
});
