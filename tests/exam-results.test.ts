import test from "node:test";
import assert from "node:assert/strict";
import { reconcileExamOutcome, resultBlocksCoursePlanning, structuralResultAction, validateResultDraft } from "../src/lib/study/exam-results.ts";

test("provisional result is recorded without structural interpretation",()=>{
  const result=reconcileExamOutcome({resultStatus:"provisional",outcome:"passed",snapshot:{readinessIndex:90,readinessBand:"strong",decisionPriority:10}});
  assert.equal(result.alignment,"provisional");
  assert.equal(structuralResultAction({resultStatus:"provisional",outcome:"passed",retakeDecision:"not_applicable"}),"none");
});

test("official pass closes the course regardless of grade format",()=>{
  assert.equal(structuralResultAction({resultStatus:"official",outcome:"passed",retakeDecision:"not_applicable"}),"complete_course");
});

test("fragile readiness plus pass is a positive directional surprise",()=>{
  const result=reconcileExamOutcome({resultStatus:"official",outcome:"passed",snapshot:{readinessIndex:58,readinessBand:"fragile",decisionPriority:80}});
  assert.equal(result.alignment,"positive_surprise");
});

test("target-ready readiness plus fail is a negative directional surprise",()=>{
  const result=reconcileExamOutcome({resultStatus:"official",outcome:"failed",snapshot:{readinessIndex:84,readinessBand:"target_ready",decisionPriority:40}});
  assert.equal(result.alignment,"negative_surprise");
});

test("insufficient pre-exam evidence cannot be judged against the result",()=>{
  const result=reconcileExamOutcome({resultStatus:"official",outcome:"failed",snapshot:{readinessIndex:null,readinessBand:"insufficient_evidence",decisionPriority:null}});
  assert.equal(result.alignment,"insufficient_evidence");
});

test("failed course remains blocked while retake decision is pending",()=>{
  assert.equal(resultBlocksCoursePlanning({resultStatus:"official",outcome:"failed",retakeDecision:"pending"}),true);
  assert.equal(resultBlocksCoursePlanning({resultStatus:"official",outcome:"failed",retakeDecision:"planned"}),false);
});

test("planned retake requires a future exam timestamp",()=>{
  const error=validateResultDraft({
    attemptNo:1,resultStatus:"official",outcome:"failed",scorePercent:49,
    retakeDecision:"planned",nextExamAt:"2026-10-20T10:00:00Z",examAt:"2026-10-06T10:00:00Z",nowIso:"2026-10-07T10:00:00Z",
  });
  assert.equal(error,null);
  const invalid=validateResultDraft({
    attemptNo:1,resultStatus:"official",outcome:"failed",scorePercent:49,
    retakeDecision:"planned",nextExamAt:"2026-10-06T12:00:00Z",examAt:"2026-10-06T10:00:00Z",nowIso:"2026-10-07T10:00:00Z",
  });
  assert.ok(invalid);
});

test("passed results cannot retain retake state",()=>{
  const error=validateResultDraft({
    attemptNo:1,resultStatus:"official",outcome:"passed",scorePercent:null,
    retakeDecision:"pending",nextExamAt:null,examAt:"2026-10-06T10:00:00Z",nowIso:"2026-10-07T10:00:00Z",
  });
  assert.ok(error);
});


test("persisted snake-case result rows enforce the same planning block",()=>{
  assert.equal(resultBlocksCoursePlanning({
    result_status:"official",outcome:"failed",retake_decision:"pending",
  }),true);
  assert.equal(resultBlocksCoursePlanning({
    result_status:"official",outcome:"failed",retake_decision:"planned",
  }),false);
});
