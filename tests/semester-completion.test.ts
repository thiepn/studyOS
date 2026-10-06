import test from "node:test";
import assert from "node:assert/strict";
import { buildSemesterCompletionLedger, directionalOutcomeAlignment, type SemesterCourseInput, type SemesterResultInput } from "../src/lib/study/semester-completion.ts";
import type { WeeklyCalibrationProfile } from "../src/lib/study/weekly-calibration.ts";

const calibration:WeeklyCalibrationProfile={
  completedWeeks:4,evidence:"usable",medianWeekAdherencePercent:88,capacitySignal:"aligned",
  capacityRecommendationFactor:1,capacityRecommendation:"aligned",totalRebalancedWeeks:1,totalSacrificeEvents:0,
  courses:[],weeks:[],floorAdjustments:{},
};

const course=(id:string,overrides:Partial<SemesterCourseInput>={}):SemesterCourseInput=>({
  id,displayName:id.toUpperCase(),shortName:id.toUpperCase(),courseKind:"major",credits:6,
  active:true,examAt:"2027-02-10T09:00:00Z",examFinished:false,sortOrder:1,...overrides,
});

const result=(id:string,courseId:string,attemptNo:number,overrides:Partial<SemesterResultInput>={}):SemesterResultInput=>({
  id,courseId,attemptNo,examAt:"2027-02-10T09:00:00Z",resultStatus:"official",outcome:"passed",
  gradeText:null,scorePercent:null,readinessIndexSnapshot:75,readinessBandSnapshot:"pass_ready",
  decisionPrioritySnapshot:50,retakeDecision:"not_applicable",nextExamAt:null,...overrides,
});

function build(courses:SemesterCourseInput[],results:SemesterResultInput[]){
  return buildSemesterCompletionLedger({
    semester:{displayName:"WS26/27",startsOn:"2026-10-01",endsOn:"2027-03-31"},
    today:"2027-03-20",courses,results,calibration,
  });
}

test("passed credits count once even after a failed first attempt",()=>{
  const rows=[course("dgl",{credits:9,active:false,examAt:"2027-03-01T09:00:00Z",examFinished:true})];
  const results=[
    result("a1","dgl",1,{outcome:"failed",retakeDecision:"planned",nextExamAt:"2027-03-01T09:00:00Z",readinessIndexSnapshot:58,readinessBandSnapshot:"fragile"}),
    result("a2","dgl",2,{examAt:"2027-03-01T09:00:00Z",outcome:"passed",retakeDecision:"not_applicable"}),
  ];
  const ledger=build(rows,results);
  assert.equal(ledger.summary.passedCredits,9);
  assert.equal(ledger.summary.officialAttempts,2);
  assert.equal(ledger.summary.eventualRetakePasses,1);
  assert.equal(ledger.courses[0].completionState,"passed");
});

test("planned retake remains open and credits are not counted as passed",()=>{
  const rows=[course("ti",{credits:6,courseKind:"retake",examAt:"2027-04-05T09:00:00Z",examFinished:false})];
  const results=[result("a1","ti",1,{outcome:"failed",retakeDecision:"planned",nextExamAt:"2027-04-05T09:00:00Z"})];
  const ledger=build(rows,results);
  assert.equal(ledger.courses[0].completionState,"retake_planned");
  assert.equal(ledger.summary.retakeCredits,6);
  assert.equal(ledger.summary.passedCredits,0);
  assert.equal(ledger.retrospective.status,"retakes_open");
});

test("finished retake with no new result becomes awaiting result instead of staying retake planned",()=>{
  const rows=[course("stoch",{courseKind:"retake",examAt:"2027-03-10T09:00:00Z",examFinished:true})];
  const results=[result("a1","stoch",1,{examAt:"2027-02-10T09:00:00Z",outcome:"failed",retakeDecision:"planned",nextExamAt:"2027-03-10T09:00:00Z"})];
  const ledger=build(rows,results);
  assert.equal(ledger.courses[0].completionState,"awaiting_result");
  assert.equal(ledger.retrospective.status,"results_pending");
});

test("newer provisional retake result takes precedence over the prior official failure",()=>{
  const rows=[course("amp",{courseKind:"retake",examAt:"2027-03-10T09:00:00Z",examFinished:true})];
  const results=[
    result("a1","amp",1,{examAt:"2027-02-10T09:00:00Z",outcome:"failed",retakeDecision:"planned",nextExamAt:"2027-03-10T09:00:00Z"}),
    result("a2","amp",2,{examAt:"2027-03-10T09:00:00Z",resultStatus:"provisional",outcome:"passed"}),
  ];
  const ledger=build(rows,results);
  assert.equal(ledger.courses[0].completionState,"provisional_result");
});

test("declined retake is terminal without being counted as passed",()=>{
  const rows=[course("micro",{credits:6,active:false,examAt:null,examFinished:false})];
  const results=[result("a1","micro",1,{outcome:"failed",retakeDecision:"declined"})];
  const ledger=build(rows,results);
  assert.equal(ledger.courses[0].completionState,"closed_without_pass");
  assert.equal(ledger.summary.closedWithoutPassCredits,6);
  assert.equal(ledger.summary.passedCredits,0);
  assert.equal(ledger.retrospective.status,"complete");
});

test("missing credits do not fabricate credit totals",()=>{
  const ledger=build([
    course("known",{credits:9,active:false,examFinished:true}),
    course("unknown",{credits:null,active:false,examFinished:true,sortOrder:2}),
  ],[
    result("a1","known",1),
    result("a2","unknown",1),
  ]);
  assert.equal(ledger.summary.configuredCredits,9);
  assert.equal(ledger.summary.passedCredits,9);
  assert.equal(ledger.summary.passCreditPercent,100);
  assert.equal(ledger.summary.unknownCreditCourses,1);
  assert.equal(ledger.summary.outcomeCreditCoverageComplete,false);
});

test("directional review never interprets readiness as an exam grade",()=>{
  assert.equal(directionalOutcomeAlignment(result("a","x",1,{outcome:"passed",readinessIndexSnapshot:55,readinessBandSnapshot:"fragile"})),"positive_surprise");
  assert.equal(directionalOutcomeAlignment(result("b","x",1,{outcome:"failed",retakeDecision:"pending",readinessIndexSnapshot:85,readinessBandSnapshot:"target_ready"})),"negative_surprise");
  assert.equal(directionalOutcomeAlignment(result("c","x",1,{outcome:"failed",retakeDecision:"pending",readinessIndexSnapshot:null,readinessBandSnapshot:"insufficient_evidence"})),"insufficient_evidence");
});

test("all terminal courses can close academically before the semester end date",()=>{
  const ledger=build([
    course("a",{active:false,examFinished:true}),
    course("b",{active:false,examFinished:false,sortOrder:2}),
  ],[
    result("a1","a",1,{outcome:"passed"}),
    result("b1","b",1,{outcome:"failed",retakeDecision:"declined"}),
  ]);
  assert.equal(ledger.retrospective.status,"complete");
  assert.equal(ledger.summary.terminalCourses,2);
});
