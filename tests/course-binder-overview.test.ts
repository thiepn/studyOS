import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {courseBinderOverview,isVerifiedCourseSource,sourceProcessingLabel} from "../src/lib/study/course-binder-overview.ts";
import type {WeekActionRow,WeekResource} from "../src/lib/study/workflow.ts";
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
const week=(id:string,no:number,action:string,over:Partial<WeekActionRow>={}):WeekActionRow=>({
  teaching_week_id:id,course_id:"c",week_no:no,next_action:action,resource_count:0,
  lecture_count:0,exercise_count:1,solution_count:1,verified_resources:0,pending_resources:0,
  candidate_runs:0,skill_count:3,new_skills:0,learning_skills:0,fragile_skills:0,stable_skills:0,
  exam_ready_skills:0,due_skills:2,due_minutes:12,unresolved_errors:0,health_status:"learning",
  open_findings:1,scheduled_repairs:0,lecture_retrieval_due:true,exercise_attempt_due:true,
  solution_reconcile_due:true,checkpoint_due:true,lecture_retrieval_completed_at:null,
  exercise_attempt_completed_at:null,solution_reconciled_at:null,checkpoint_completed_at:null,...over,
});
const source=(id:string,weekId:string,status:string):WeekResource=>({
  id,teaching_week_id:weekId,resource_type:"lecture",title:id,
  drive_url:"https://drive.google.com/file/d/test/view",processing_status:status,
});
test("binder uses earliest actionable teaching week without rearranging source data",()=>{
  const weeks=[week("w3",3,"await_material"),week("w1",1,"maintain"),week("w2",2,"attempt_exercise")];
  const original=structuredClone(weeks);
  const data=courseBinderOverview(weeks,[source("verified","w2","verified"),source("mapped","w2","mapped"),source("offcourse","w1","verified")]);
  assert.equal(data.activeWeek?.week_no,2);
  assert.equal(data.action,"Attempt exercise sheet");
  assert.equal(data.verifiedSources,1);assert.equal(data.pendingSources,1);
  assert.equal(data.canOpenSolutions,false);assert.equal(data.dueSkills,2);
  assert.deepEqual(weeks,original);
});
test("only explicit verified status may be counted as source verified",()=>{
  for(const status of ["new","classified","extracted","mapped","needs_review","archived","unknown"]){
    assert.equal(isVerifiedCourseSource(source("a","w",status)),false,status);
    assert.match(sourceProcessingLabel(status),/not(?: yet)? verified|review/i,status);
  }
  assert.equal(isVerifiedCourseSource(source("a","w","verified")),true);
  assert.equal(sourceProcessingLabel("verified"),"Source verified");
});
test("independent exercise attempt controls solution availability, not mere registration",()=>{
  const notReady=courseBinderOverview([week("w1",1,"attempt_exercise")],[source("a","w1","verified")]);
  assert.equal(notReady.canOpenSolutions,false);
  const ready=courseBinderOverview([week("w1",1,"reconcile_solution",{
    exercise_attempt_completed_at:"2026-10-09T10:00:00Z",
    lecture_retrieval_completed_at:"2026-10-09T09:00:00Z",
  })],[]);
  assert.equal(ready.canOpenSolutions,true);assert.equal(ready.completedStages,2);
  assert.equal(courseBinderOverview([],[]).activeWeek,null);
});
test("binder landmarks, week navigation, evidence and source status are accessible",()=>{
  const page=read("../src/app/courses/[id]/page.tsx");
  const panel=read("../src/components/week-workflow-panel.tsx");
  const css=read("../src/app/course-binder.css");
  const ui=read("../src/components/course-binder-overview.tsx");
  assert.match(page,/<CourseBinderOverview/);
  for(const id of ["course-weeks","course-master-map","course-exam-intelligence","course-settings"])
    assert.ok(page.includes('id="'+id+'"'),id);
  assert.match(ui,/aria-labelledby="binder-overview-heading"/);
  assert.match(panel,/aria-label="Teaching week index"/);
  assert.match(panel,/aria-expanded=\{isExpanded\}/);
  assert.match(panel,/aria-controls=\{isExpanded/);
  assert.match(panel,/canOpenWeekSolutions\(week\)/);
  assert.match(panel,/sourceProcessingLabel\(resource\.processing_status\)/);
  assert.match(css,/@media\(max-width:580px\)/);
  assert.match(css,/@media\(forced-colors:active\)/);
  assert.doesNotMatch(css,/gradient\(/);
});
test("F07 keeps private API boundaries and adds no direct data mutations",()=>{
  const module=read("../src/lib/study/course-binder-overview.ts");
  const ui=read("../src/components/course-binder-overview.tsx");
  assert.doesNotMatch(module,/(?:fetch\(|supabase\.|\.update\(|\.insert\(|localStorage)/);
  assert.doesNotMatch(ui,/(?:fetch\(|supabase\.|localStorage)/);
  const page=read("../src/app/courses/[id]/page.tsx");
  assert.match(page,/getCourseWorkflow\(id\)/);
  assert.match(page,/getCourseExamIntelligence\(id\)/);
});
