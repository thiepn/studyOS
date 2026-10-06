import test from "node:test";
import assert from "node:assert/strict";
import { buildCourseForecast, summarizeSemesterForecast, type ForecastInput } from "../src/lib/study/forecast.ts";

const base=(overrides:Partial<ForecastInput>={}):ForecastInput=>({
  courseId:"c1",displayName:"DGL",shortName:"DGL",courseKind:"major",credits:9,
  totalSkills:20,testedSkills:12,coveragePercent:70,durableMasteryPercent:65,examReadyPercent:60,
  independentSuccessPercent:68,riskScore:30,riskBand:"watch",actionableBacklog:1,dueOrAtRiskSkills:2,unresolvedErrors:1,
  operatingMode:"semester",daysToExam:80,
  calibrationStatus:"usable",calibrationAccuracyPercent:70,calibrationIndependentAttempts:12,calibrationNeeds:false,
  driftBand:"on_track",driftSufficient:true,driftScore:0,driftAccuracyDelta:2,driftCorrectionKind:"none",driftCorrectionMinutes:0,
  difficultySignal:"responsive",evaluatedInterventions:2,interventionEffectivenessRate:50,latestInterventionOutcome:"effective",
  strategyAwaitingEvidence:false,strategyRecommendedKey:null,strategyRecommendedTitle:null,strategyRecommendedMinutes:null,
  strategyEscalation:"none",strategyProvenCount:0,strategyPromisingCount:0,strategyRetiredCount:0,
  processedExams:1,simulatableExams:1,blueprintConfidence:"low",verifiedSolutionCoveragePercent:50,
  lastVerifiedScorePercent:null,lastVerifiedCoveragePercent:null,
  examNextAction:"maintain_blueprint",examNextActionReason:"Semester mode",examStrategyDurationMinutes:90,
  ...overrides,
});

test("thin evidence stays unclassified instead of fabricating precision",()=>{
  const result=buildCourseForecast(base({
    totalSkills:20,testedSkills:0,coveragePercent:10,durableMasteryPercent:0,examReadyPercent:0,
    independentSuccessPercent:null,calibrationStatus:"uncalibrated",calibrationAccuracyPercent:null,
    calibrationIndependentAttempts:0,calibrationNeeds:true,driftBand:"insufficient_data",driftSufficient:false,
    difficultySignal:"insufficient_evidence",evaluatedInterventions:0,latestInterventionOutcome:null,
    processedExams:0,simulatableExams:0,blueprintConfidence:null,
  }));
  assert.equal(result.band,"insufficient_evidence");
  assert.equal(result.readinessIndex,null);
  assert.equal(result.nextAction.kind,"collect_evidence");
});

test("strong verified transfer can produce target-ready high-confidence outlook",()=>{
  const result=buildCourseForecast(base({
    testedSkills:19,coveragePercent:95,durableMasteryPercent:88,examReadyPercent:90,independentSuccessPercent:91,
    calibrationStatus:"established",calibrationAccuracyPercent:90,calibrationIndependentAttempts:30,
    driftBand:"on_track",driftSufficient:true,difficultySignal:"responsive",evaluatedInterventions:3,
    strategyProvenCount:1,processedExams:4,blueprintConfidence:"high",
    lastVerifiedScorePercent:88,lastVerifiedCoveragePercent:95,riskScore:8,actionableBacklog:0,dueOrAtRiskSkills:0,
  }));
  assert.ok(result.readinessIndex!=null&&result.readinessIndex>=80);
  assert.ok(result.band==="target_ready"||result.band==="strong");
  assert.equal(result.confidence,"high");
  assert.ok(result.readinessRange&&result.readinessRange.high-result.readinessRange.low<=12);
});

test("critical drift and structural failure lower readiness and raise decision priority",()=>{
  const healthy=buildCourseForecast(base());
  const troubled=buildCourseForecast(base({
    riskScore:78,driftBand:"critical",driftScore:65,driftAccuracyDelta:-18,
    difficultySignal:"structural",evaluatedInterventions:3,latestInterventionOutcome:"regressed",
    strategyRecommendedKey:"prerequisite_repair",strategyRecommendedTitle:"Prerequisite repair",strategyRecommendedMinutes:20,
  }));
  assert.ok(troubled.provisionalIndex<healthy.provisionalIndex);
  assert.equal(troubled.trajectory,"declining");
  assert.ok(troubled.decisionPriority>healthy.decisionPriority);
});

test("P9 exam strategy outranks P16 method work in exam mode",()=>{
  const result=buildCourseForecast(base({
    operatingMode:"exam",daysToExam:5,examNextAction:"timed_paper",examNextActionReason:"Need certified exam transfer",
    examStrategyDurationMinutes:120,difficultySignal:"structural",
    strategyRecommendedKey:"oral_explanation",strategyRecommendedTitle:"Oral explanation",strategyRecommendedMinutes:15,
  }));
  assert.equal(result.nextAction.authority,"P9");
  assert.equal(result.nextAction.kind,"exam_strategy");
  assert.equal(result.nextAction.estimatedMinutes,120);
});

test("structural course outside exam mode uses a different P16 strategy",()=>{
  const result=buildCourseForecast(base({
    difficultySignal:"structural",strategyRecommendedKey:"method_discrimination",
    strategyRecommendedTitle:"Method discrimination",strategyRecommendedMinutes:20,
  }));
  assert.equal(result.nextAction.authority,"P16");
  assert.equal(result.nextAction.kind,"strategy_experiment");
});

test("exhausted strategy portfolio escalates to external support",()=>{
  const result=buildCourseForecast(base({
    difficultySignal:"structural",strategyEscalation:"external_support",strategyRetiredCount:7,
  }));
  assert.equal(result.nextAction.kind,"external_support");
  assert.equal(result.nextAction.authority,"P16");
});

test("semester summary is credit-weighted and identifies highest-priority course",()=>{
  const a=buildCourseForecast(base({courseId:"a",credits:9}));
  const b=buildCourseForecast(base({courseId:"b",credits:6,riskScore:85,driftBand:"critical",driftAccuracyDelta:-15}));
  const summary=summarizeSemesterForecast([a,b]);
  assert.equal(summary.courseCount,2);
  assert.equal(summary.topPriorityCourseId,"b");
  assert.ok(summary.weightedReadinessIndex!=null);
});


test("missing P9 timed-paper duration uses the conservative 90-minute fallback",()=>{
  const result=buildCourseForecast(base({
    operatingMode:"exam",daysToExam:6,examNextAction:"timed_paper",
    examStrategyDurationMinutes:null,
  }));
  assert.equal(result.nextAction.authority,"P9");
  assert.equal(result.nextAction.estimatedMinutes,90);
});


test("post-exam courses leave the active semester decision queue",()=>{
  const result=buildCourseForecast(base({
    operatingMode:"post_exam",daysToExam:-2,riskScore:95,dueOrAtRiskSkills:8,actionableBacklog:5,
  }));
  assert.equal(result.decisionPriority,0);
  assert.equal(result.nextAction.expectedValue,0);
  assert.equal(result.nextAction.estimatedMinutes,0);
  assert.match(result.nextAction.title,/exam complete/i);
});
