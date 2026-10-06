import test from "node:test";
import assert from "node:assert/strict";
import { bootstrapAllowsCandidate, evaluateSemesterBootstrap, historicalPriorUse, parseBootstrapCourseDraft } from "../src/lib/study/semester-bootstrap.ts";

const course=(overrides:Record<string,unknown>={})=>({
  courseId:"c1",stableKey:"dgl",displayName:"Differentialgleichungen",shortName:"DGL",courseKind:"major" as const,
  credits:9,driveFolderReady:true,workflowReady:true,verifiedResourceCount:1,skillCount:8,questionCount:8,
  baselineStatus:"not_started",historicalPriorCount:0,...overrides,
});

test("bootstrap certification needs a real course, Drive, curriculum and workflow",()=>{
  const result=evaluateSemesterBootstrap({certifiedAt:null,driveConnected:true,driveTreeReady:true,courses:[course()]});
  assert.equal(result.ready,true);
  assert.equal(result.readyCourses,1);
});

test("retake requires a completed fresh baseline even with historical prior",()=>{
  const result=evaluateSemesterBootstrap({
    certifiedAt:null,driveConnected:true,driveTreeReady:true,
    courses:[course({courseKind:"retake",baselineStatus:"in_progress",historicalPriorCount:1}) as any],
  });
  assert.equal(result.ready,false);
  assert.ok(result.courses[0].blockers.some(item=>item.includes("baseline")));
});

test("historical prior never substitutes for current curriculum evidence",()=>{
  const result=evaluateSemesterBootstrap({
    certifiedAt:null,driveConnected:true,driveTreeReady:true,
    courses:[course({verifiedResourceCount:0,skillCount:0,questionCount:0,historicalPriorCount:2})],
  });
  assert.equal(result.ready,false);
  assert.equal(result.courses[0].curriculumReady,false);
});

test("Drive is a semester bootstrap requirement",()=>{
  const result=evaluateSemesterBootstrap({certifiedAt:null,driveConnected:false,driveTreeReady:false,courses:[course()]});
  assert.equal(result.ready,false);
  assert.ok(result.blockers.includes("Connect Study Drive."));
});

test("course parser accepts reusable workflow expectations but rejects unsafe identifiers",()=>{
  const parsed=parseBootstrapCourseDraft({
    stableKey:"analysis_iii",displayName:"Analysis III",courseKind:"major",credits:9,
    expectedLecturesPerWeek:2,expectsExercise:true,expectsSolution:true,
  });
  assert.equal(parsed.stableKey,"analysis_iii");
  assert.equal(parsed.lectureRetrievalTargetHours,24);
  assert.throws(()=>parseBootstrapCourseDraft({stableKey:"Analysis III",displayName:"Analysis III"}));
});

test("historical prior language explicitly keeps mastery current-semester authoritative",()=>{
  assert.match(historicalPriorUse("prerequisite"),/Current-semester evidence remains authoritative/);
  assert.match(historicalPriorUse("direct_retake"),/Do not restore old mastery/);
});


test("uncertified semester preserves real commitments but blocks discretionary candidates",()=>{
  assert.equal(bootstrapAllowsCandidate(false,"commitment"),true);
  assert.equal(bootstrapAllowsCandidate(false,"review"),false);
  assert.equal(bootstrapAllowsCandidate(false,"workflow"),false);
  assert.equal(bootstrapAllowsCandidate(true,"workflow"),true);
});
