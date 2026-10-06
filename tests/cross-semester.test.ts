import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLongitudinalProfiles,evaluatePriorTransfer,summarizeRelationReliability,
  type PriorTransferInput,
} from "../src/lib/study/cross-semester.ts";

const input=(overrides:Partial<PriorTransferInput>={}):PriorTransferInput=>({
  priorId:"p1",courseId:"c2",stableKey:"dgl",displayName:"Differentialgleichungen",
  sourceCourseId:"c1",sourceDisplayName:"Differentialgleichungen I",relation:"direct_retake",
  snapshot:{latestOutcome:"passed",latestScorePercent:82,latestReadinessIndex:80,unresolvedFindings:0},
  baseline:{status:"completed",retained:6,rusty:1,weak:1,neverMastered:0},
  earlyAttempts:[
    {result:"correct",independence:"independent"},
    {result:"correct",independence:"independent"},
    {result:"partial",independence:"independent"},
    {result:"correct",independence:"independent"},
    {result:"correct",independence:"independent"},
    {result:"correct",independence:"independent"},
  ],
  ...overrides,
});

test("positive archived signal confirmed by fresh evidence stays advisory",()=>{
  const result=evaluatePriorTransfer(input());
  assert.equal(result.sourceSignal,"positive");
  assert.equal(result.currentSignal,"positive");
  assert.equal(result.outcome,"confirmed");
  assert.match(result.recommendation,/current-semester evidence remains authoritative/);
});

test("recurring weak evidence is confirmed without restoring historical mastery",()=>{
  const result=evaluatePriorTransfer(input({
    snapshot:{latestOutcome:"failed",latestScorePercent:48,latestReadinessIndex:45,unresolvedFindings:5},
    baseline:{status:"completed",retained:1,rusty:1,weak:4,neverMastered:2},
    earlyAttempts:[
      {result:"incorrect",independence:"independent"},
      {result:"partial",independence:"independent"},
      {result:"incorrect",independence:"independent"},
      {result:"incorrect",independence:"independent"},
      {result:"partial",independence:"independent"},
    ],
  }));
  assert.equal(result.sourceSignal,"negative");
  assert.equal(result.currentSignal,"negative");
  assert.equal(result.outcome,"confirmed");
  assert.match(result.recommendation,/recurring/);
});

test("contradicted prior is down-weighted when current evidence reverses it",()=>{
  const result=evaluatePriorTransfer(input({
    snapshot:{latestOutcome:"failed",latestScorePercent:52,latestReadinessIndex:50,unresolvedFindings:4},
  }));
  assert.equal(result.outcome,"contradicted");
  assert.match(result.recommendation,/Down-weight/);
});

test("sparse early evidence does not validate a non-retake prior",()=>{
  const result=evaluatePriorTransfer(input({
    relation:"prerequisite",baseline:null,
    earlyAttempts:[
      {result:"correct",independence:"independent"},
      {result:"correct",independence:"independent"},
      {result:"partial",independence:"guided"},
    ],
  }));
  assert.equal(result.currentSignal,"unknown");
  assert.equal(result.outcome,"insufficient_evidence");
  assert.equal(result.confidence,"low");
});

test("relation reliability excludes insufficient cases from the denominator",()=>{
  const confirmed=evaluatePriorTransfer(input({priorId:"a"}));
  const contradicted=evaluatePriorTransfer(input({
    priorId:"b",snapshot:{latestOutcome:"failed",latestScorePercent:45,latestReadinessIndex:40,unresolvedFindings:4},
  }));
  const insufficient=evaluatePriorTransfer(input({
    priorId:"c",relation:"prerequisite",baseline:null,
    earlyAttempts:[{result:"correct",independence:"independent"}],
  }));
  const direct=summarizeRelationReliability([confirmed,contradicted,insufficient]).find((row)=>row.relation==="direct_retake");
  const prerequisite=summarizeRelationReliability([confirmed,contradicted,insufficient]).find((row)=>row.relation==="prerequisite");
  assert.equal(direct?.usable,2);
  assert.equal(direct?.reliabilityPercent,50);
  assert.equal(prerequisite?.usable,0);
  assert.equal(prerequisite?.reliabilityPercent,null);
});

test("repeated direct-retake confirmations produce a durable longitudinal pattern",()=>{
  const first=evaluatePriorTransfer(input({priorId:"a",courseId:"c2"}));
  const second=evaluatePriorTransfer(input({priorId:"b",courseId:"c3",sourceCourseId:"c2",sourceDisplayName:"DGL second attempt"}));
  const related=evaluatePriorTransfer(input({priorId:"c",relation:"related",stableKey:"dgl"}));
  const profile=buildLongitudinalProfiles([first,second,related])[0];
  assert.equal(profile.usableTransitions,2);
  assert.equal(profile.pattern,"durable_strength");
  assert.equal(profile.positiveConfirmations,2);
});

test("repeated contradiction is classified as context-sensitive rather than a stable trait",()=>{
  const weakSnapshot={latestOutcome:"failed",latestScorePercent:45,latestReadinessIndex:40,unresolvedFindings:5};
  const one=evaluatePriorTransfer(input({priorId:"a",snapshot:weakSnapshot}));
  const two=evaluatePriorTransfer(input({priorId:"b",courseId:"c3",sourceCourseId:"c2",snapshot:weakSnapshot}));
  const profile=buildLongitudinalProfiles([one,two])[0];
  assert.equal(profile.contradictions,2);
  assert.equal(profile.pattern,"context_sensitive");
});
