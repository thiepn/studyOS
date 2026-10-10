import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {courseSetupSummary,nextCourseSetupAction,nextSemesterOnboardingStage,semesterDateValidation} from "../src/lib/study/semester-management.ts";
import type {BootstrapCourseState,SemesterBootstrapEvaluation} from "../src/lib/study/semester-bootstrap.ts";
const make=(changes:Partial<BootstrapCourseState>={}):BootstrapCourseState=>({
  courseId:"course1",stableKey:"analysis",displayName:"Analysis",shortName:"Ana",courseKind:"major",
  credits:9,driveFolderReady:true,workflowReady:true,verifiedResourceCount:1,skillCount:3,questionCount:8,
  baselineStatus:"not_started",historicalPriorCount:0,identityReady:true,curriculumReady:true,baselineReady:true,ready:true,blockers:[],...changes
});
const evalState=(changes:Partial<SemesterBootstrapEvaluation>={}):SemesterBootstrapEvaluation=>({
  ready:true,certified:false,courseCount:1,readyCourses:1,driveConnected:true,driveTreeReady:true,blockers:[],
  courses:[make()],percent:100,...changes
});
test("setup phases follow current recorded evidence rather than invented certification",()=>{
  assert.equal(nextSemesterOnboardingStage(evalState({courses:[],courseCount:0,readyCourses:0,ready:false})),"roster");
  assert.equal(nextSemesterOnboardingStage(evalState({driveConnected:false,ready:false})),"drive");
  assert.equal(nextSemesterOnboardingStage(evalState({courses:[make({curriculumReady:false,ready:false})],ready:false,readyCourses:0})),"curriculum");
  assert.equal(nextSemesterOnboardingStage(evalState({courses:[make({courseKind:"retake",baselineReady:false,ready:false})],ready:false,readyCourses:0})),"baseline");
  assert.equal(nextSemesterOnboardingStage(evalState()),"certification");
  assert.equal(nextSemesterOnboardingStage(evalState({certified:true})),"certified");
  assert.equal(courseSetupSummary(evalState()).uncertified,true);
});
test("incomplete course actions never assert mastery and remain course-scoped",()=>{
  assert.match(nextCourseSetupAction(make({workflowReady:false,ready:false})).href,/#course-settings$/);
  assert.match(nextCourseSetupAction(make({driveFolderReady:false,ready:false})).href,/semester\/bootstrap/);
  assert.match(nextCourseSetupAction(make({curriculumReady:false,ready:false})).href,/resources\?course=course1/);
  assert.match(nextCourseSetupAction(make({courseKind:"retake",baselineReady:false,ready:false})).href,/diagnostics\/course1/);
  assert.match(nextCourseSetupAction(make()).detail,/formal semester confirmation is separate/);
});
test("dates are validated as calendar dates, not simply lexicographical strings",()=>{
  assert.equal(semesterDateValidation("2026-10-01","2027-03-31"),null);
  assert.equal(semesterDateValidation("2026-10-01",""),null);
  assert.match(semesterDateValidation("2026-02-29","")??"",/valid semester start/);
  assert.match(semesterDateValidation("2026-10-10","2026-10-09")??"",/on or after/);
  assert.match(semesterDateValidation("2026-13-01","")??"",/valid semester start/);
});
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
test("reviewing and removing a historical prior requires explicit action with visible errors",()=>{
  const s=read("../src/components/semester-bootstrap-controls.tsx");
  assert.match(s,/RemovePriorButton/);
  assert.match(s,/Confirm detach/);
  assert.match(s,/role="alert"/);
  assert.match(s,/disabled=\{!confirmed/);
  assert.match(s,/semesterDateValidation/);
});
test("setup guide uses existing certification contract and accessible current step",()=>{
  const view=read("../src/components/semester-setup-guide.tsx");
  const page=read("../src/app/semester/bootstrap/page.tsx");
  const css=read("../src/app/semester-management.css");
  assert.match(view,/nextCourseSetupAction/);
  assert.match(view,/aria-current=\{current\?"step":undefined\}/);
  assert.match(page,/<SemesterSetupGuide evaluation=\{evaluation\}/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/@media\(forced-colors:active\)/);
  assert.doesNotMatch(css,/gradient\(/);
});

test("exam schedule edits and archived calendar cleanup are guarded by user confirmation",()=>{
  const course=read("../src/components/course-config-form.tsx");
  const archive=read("../src/components/archive-calendar-cleanup.tsx");
  assert.match(course,/examChanged&&\!reviewedExam/);
  assert.match(course,/type="checkbox" checked=\{reviewedExam\}/);
  assert.match(course,/Exam schedule changed/);
  assert.match(archive,/if\(!confirmed\|\|busy\)return/);
  assert.match(archive,/disabled=\{busy\|\|!confirmed\}/);
  assert.match(archive,/actual Google Calendar events/);
});
test("active and archived semester navigation is explicitly separated",()=>{
  const active=read("../src/app/courses/page.tsx");
  const history=read("../src/app/semesters/page.tsx");
  const archived=read("../src/app/semester/archive/[semesterId]/page.tsx");
  assert.match(active,/href="\/semester\/bootstrap#semester-roster"/);
  assert.match(history,/Archived semesters are historical, read-only/);
  assert.match(archived,/Read-only historical record/);
  assert.match(archived,/semesterLifecycle\.active\)return notFound\(\)/);
  const nav=read("../src/app/semester/bootstrap/page.tsx");
  assert.match(nav,/id="bootstrap-drive"/);
  assert.match(nav,/id="semester-roster"/);
  assert.match(nav,/id="semester-historical"/);
});
