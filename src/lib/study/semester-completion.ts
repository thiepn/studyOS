import type { WeeklyCalibrationProfile } from "./weekly-calibration";

export type SemesterCompletionState=
  |"passed"
  |"retake_planned"
  |"retake_pending"
  |"closed_without_pass"
  |"provisional_result"
  |"awaiting_result"
  |"ongoing"
  |"inactive_unresolved";

export type SemesterReviewStatus="in_progress"|"results_pending"|"retakes_open"|"complete"|"incomplete_data";
export type OutcomeAlignment="insufficient_evidence"|"aligned"|"positive_surprise"|"negative_surprise"|"mixed";

export type SemesterCourseInput={
  id:string;
  displayName:string;
  shortName:string|null;
  courseKind:string;
  credits:number|null;
  active:boolean;
  examAt:string|null;
  examFinished:boolean;
  sortOrder:number;
};

export type SemesterResultInput={
  id:string;
  courseId:string;
  attemptNo:number;
  examAt:string;
  resultStatus:string;
  outcome:string;
  gradeText:string|null;
  scorePercent:number|null;
  readinessIndexSnapshot:number|null;
  readinessBandSnapshot:string|null;
  decisionPrioritySnapshot:number|null;
  retakeDecision:string;
  nextExamAt:string|null;
};

export type SemesterCourseLedger={
  courseId:string;
  displayName:string;
  shortName:string|null;
  courseKind:string;
  credits:number|null;
  active:boolean;
  completionState:SemesterCompletionState;
  attempts:SemesterResultInput[];
  latestResult:SemesterResultInput|null;
  latestOfficial:SemesterResultInput|null;
  passedAttemptNo:number|null;
  officialAttempts:number;
  nonPassingAttempts:number;
  currentExamAt:string|null;
  nextExamAt:string|null;
};

export type SemesterCompletionSummary={
  totalCourses:number;
  terminalCourses:number;
  passedCourses:number;
  retakePlannedCourses:number;
  retakePendingCourses:number;
  closedWithoutPassCourses:number;
  provisionalCourses:number;
  awaitingResultCourses:number;
  ongoingCourses:number;
  inactiveUnresolvedCourses:number;
  configuredCredits:number;
  unknownCreditCourses:number;
  passedCredits:number;
  retakeCredits:number;
  unresolvedCredits:number;
  closedWithoutPassCredits:number;
  passCreditPercent:number|null;
  outcomeCreditCoverageComplete:boolean;
  officialAttempts:number;
  nonPassingAttempts:number;
  firstAttemptPasses:number;
  eventualRetakePasses:number;
};

export type ForecastReview={
  evaluatedAttempts:number;
  aligned:number;
  positiveSurprises:number;
  negativeSurprises:number;
  mixed:number;
  insufficientEvidence:number;
  alignmentRate:number|null;
  summary:string;
};

export type SemesterRetrospective={
  status:SemesterReviewStatus;
  summary:string;
  forecastReview:ForecastReview;
  execution:{
    completedWeeks:number;
    evidence:string;
    medianWeekAdherencePercent:number|null;
    capacitySignal:string;
    rebalancedWeeks:number;
    sacrificeEvents:number;
    summary:string;
  };
  strengths:string[];
  concerns:string[];
  nextSemesterActions:string[];
};

export type SemesterCompletionLedger={
  semester:{
    displayName:string;
    startsOn:string|null;
    endsOn:string|null;
    today:string;
  };
  courses:SemesterCourseLedger[];
  summary:SemesterCompletionSummary;
  retrospective:SemesterRetrospective;
};

const credits=(course:SemesterCourseLedger)=>course.credits??0;
const terminal=(state:SemesterCompletionState)=>state==="passed"||state==="closed_without_pass";

function latest<T extends {attemptNo:number}>(rows:T[]){
  return [...rows].sort((a,b)=>b.attemptNo-a.attemptNo)[0]??null;
}

export function directionalOutcomeAlignment(result:SemesterResultInput):OutcomeAlignment{
  if(result.resultStatus!=="official")return "insufficient_evidence";
  const readiness=result.readinessIndexSnapshot;
  const band=result.readinessBandSnapshot;
  if(readiness==null||band==="insufficient_evidence")return "insufficient_evidence";
  const passed=result.outcome==="passed";
  if(passed){
    if(readiness<65)return "positive_surprise";
    return "aligned";
  }
  if(readiness>=80)return "negative_surprise";
  if(readiness<65)return "aligned";
  return "mixed";
}

function completionState(course:SemesterCourseInput,attempts:SemesterResultInput[]):SemesterCompletionState{
  const latestAny=latest(attempts);
  const latestOfficial=latest(attempts.filter(result=>result.resultStatus==="official"));
  const latestIsNewerProvisional=latestAny?.resultStatus==="provisional"
    &&(!latestOfficial||latestAny.attemptNo>latestOfficial.attemptNo);
  if(latestIsNewerProvisional)return "provisional_result";
  if(latestOfficial?.outcome==="passed")return "passed";

  const latestMatchesCurrentExam=Boolean(
    course.examAt&&latestAny?.examAt&&Date.parse(course.examAt)===Date.parse(latestAny.examAt)
  );
  if(course.examFinished&&!latestMatchesCurrentExam)return "awaiting_result";
  if(latestAny?.resultStatus==="provisional")return "provisional_result";

  if(latestOfficial){
    if(latestOfficial.retakeDecision==="planned")return "retake_planned";
    if(latestOfficial.retakeDecision==="pending")return "retake_pending";
    if(latestOfficial.retakeDecision==="declined")return "closed_without_pass";
  }
  if(course.examFinished)return "awaiting_result";
  if(course.active)return "ongoing";
  return "inactive_unresolved";
}

export function buildSemesterCompletionLedger(input:{
  semester:{displayName:string;startsOn:string|null;endsOn:string|null};
  today:string;
  courses:SemesterCourseInput[];
  results:SemesterResultInput[];
  calibration:WeeklyCalibrationProfile;
}):SemesterCompletionLedger{
  const courseRows=input.courses
    .map((course):SemesterCourseLedger=>{
      const attempts=input.results.filter(result=>result.courseId===course.id).sort((a,b)=>a.attemptNo-b.attemptNo);
      const latestResult=latest(attempts);
      const latestOfficial=latest(attempts.filter(result=>result.resultStatus==="official"));
      const pass=attempts.find(result=>result.resultStatus==="official"&&result.outcome==="passed")??null;
      const state=completionState(course,attempts);
      return {
        courseId:course.id,displayName:course.displayName,shortName:course.shortName,courseKind:course.courseKind,
        credits:course.credits,active:course.active,completionState:state,attempts,latestResult,latestOfficial,
        passedAttemptNo:pass?.attemptNo??null,
        officialAttempts:attempts.filter(result=>result.resultStatus==="official").length,
        nonPassingAttempts:attempts.filter(result=>result.resultStatus==="official"&&result.outcome!=="passed").length,
        currentExamAt:course.examAt,nextExamAt:latestOfficial?.nextExamAt??null,
      };
    })
    .sort((a,b)=>input.courses.find(c=>c.id===a.courseId)!.sortOrder-input.courses.find(c=>c.id===b.courseId)!.sortOrder);

  const known=courseRows.filter(course=>course.credits!=null);
  const configuredCredits=known.reduce((sum,course)=>sum+credits(course),0);
  const passedCredits=courseRows.filter(course=>course.completionState==="passed").reduce((sum,course)=>sum+credits(course),0);
  const retakeCredits=courseRows.filter(course=>course.completionState==="retake_planned").reduce((sum,course)=>sum+credits(course),0);
  const unresolvedCredits=courseRows
    .filter(course=>["retake_pending","provisional_result","awaiting_result","ongoing","inactive_unresolved"].includes(course.completionState))
    .reduce((sum,course)=>sum+credits(course),0);
  const closedWithoutPassCredits=courseRows.filter(course=>course.completionState==="closed_without_pass").reduce((sum,course)=>sum+credits(course),0);

  const summary:SemesterCompletionSummary={
    totalCourses:courseRows.length,
    terminalCourses:courseRows.filter(course=>terminal(course.completionState)).length,
    passedCourses:courseRows.filter(course=>course.completionState==="passed").length,
    retakePlannedCourses:courseRows.filter(course=>course.completionState==="retake_planned").length,
    retakePendingCourses:courseRows.filter(course=>course.completionState==="retake_pending").length,
    closedWithoutPassCourses:courseRows.filter(course=>course.completionState==="closed_without_pass").length,
    provisionalCourses:courseRows.filter(course=>course.completionState==="provisional_result").length,
    awaitingResultCourses:courseRows.filter(course=>course.completionState==="awaiting_result").length,
    ongoingCourses:courseRows.filter(course=>course.completionState==="ongoing").length,
    inactiveUnresolvedCourses:courseRows.filter(course=>course.completionState==="inactive_unresolved").length,
    configuredCredits,unknownCreditCourses:courseRows.length-known.length,
    passedCredits,retakeCredits,unresolvedCredits,closedWithoutPassCredits,
    passCreditPercent:configuredCredits?Math.round(passedCredits/configuredCredits*100):null,
    outcomeCreditCoverageComplete:courseRows.every(course=>course.credits!=null),
    officialAttempts:courseRows.reduce((sum,course)=>sum+course.officialAttempts,0),
    nonPassingAttempts:courseRows.reduce((sum,course)=>sum+course.nonPassingAttempts,0),
    firstAttemptPasses:courseRows.filter(course=>course.passedAttemptNo===1).length,
    eventualRetakePasses:courseRows.filter(course=>(course.passedAttemptNo??0)>1).length,
  };

  const officialResults=input.results.filter(result=>result.resultStatus==="official");
  const alignments=officialResults.map(directionalOutcomeAlignment);
  const evaluated=alignments.filter(value=>value!=="insufficient_evidence");
  const aligned=alignments.filter(value=>value==="aligned").length;
  const forecastReview:ForecastReview={
    evaluatedAttempts:evaluated.length,
    aligned,
    positiveSurprises:alignments.filter(value=>value==="positive_surprise").length,
    negativeSurprises:alignments.filter(value=>value==="negative_surprise").length,
    mixed:alignments.filter(value=>value==="mixed").length,
    insufficientEvidence:alignments.filter(value=>value==="insufficient_evidence").length,
    alignmentRate:evaluated.length?Math.round(aligned/evaluated.length*100):null,
    summary:evaluated.length
      ?"P17 readiness and actual outcomes are compared only directionally across "+evaluated.length+" sufficiently evidenced official attempt"+(evaluated.length===1?"":"s")+"."
      :"There are not yet enough official attempts with usable P17 snapshots for a meaningful outcome review.",
  };

  const pendingResults=summary.provisionalCourses+summary.awaitingResultCourses;
  const retakes=summary.retakePendingCourses+summary.retakePlannedCourses;
  let status:SemesterReviewStatus="in_progress";
  if(summary.inactiveUnresolvedCourses>0)status="incomplete_data";
  else if(pendingResults>0)status="results_pending";
  else if(retakes>0)status="retakes_open";
  else if(summary.totalCourses>0&&summary.terminalCourses===summary.totalCourses)status="complete";

  const calibration=input.calibration;
  const executionSummary=calibration.completedWeeks<3
    ?"Execution history is still too thin for a stable semester-level capacity judgment."
    :calibration.capacitySignal==="aligned"
      ?"Weekly commitment size was broadly compatible with actual execution."
      :calibration.capacitySignal==="commitment_too_high"
        ?"Weekly course commitments were repeatedly larger than what was actually completed."
        :calibration.capacitySignal==="commitment_too_low"
          ?"Weekly course commitments were repeatedly exceeded, suggesting conservative capacity estimates."
          :"Weekly execution was volatile; a single capacity adjustment would oversimplify the pattern.";

  const strengths:string[]=[];
  const concerns:string[]=[];
  const nextSemesterActions:string[]=[];

  if(summary.passedCourses)strengths.push(summary.passedCourses+" course"+(summary.passedCourses===1?"":"s")+" passed for "+passedCredits+" configured credit"+(passedCredits===1?"":"s")+".");
  if(summary.eventualRetakePasses)strengths.push(summary.eventualRetakePasses+" course"+(summary.eventualRetakePasses===1?"":"s")+" eventually passed after more than one official attempt.");
  if(forecastReview.negativeSurprises===0&&forecastReview.evaluatedAttempts>=2)strengths.push("No target-ready/strong P17 snapshot ended in a non-pass among sufficiently evidenced attempts.");
  if(calibration.completedWeeks>=3&&calibration.capacitySignal==="aligned")strengths.push("P19/P20 weekly capacity was broadly executable across completed weeks.");

  if(summary.retakePendingCourses)concerns.push(summary.retakePendingCourses+" retake decision"+(summary.retakePendingCourses===1?" remains":"s remain")+" unresolved.");
  if(summary.retakePlannedCourses)concerns.push(summary.retakePlannedCourses+" course"+(summary.retakePlannedCourses===1?" has":"s have")+" a planned retake and therefore remains part of the academic workload.");
  if(summary.closedWithoutPassCourses)concerns.push(summary.closedWithoutPassCourses+" course"+(summary.closedWithoutPassCourses===1?" closed":"s closed")+" without a passing result.");
  if(pendingResults)concerns.push(pendingResults+" course result"+(pendingResults===1?" is":"s are")+" still provisional or missing.");
  if(summary.unknownCreditCourses)concerns.push(summary.unknownCreditCourses+" course"+(summary.unknownCreditCourses===1?" has":"s have")+" no configured credits, so credit percentages are partial.");
  if(forecastReview.negativeSurprises)concerns.push(forecastReview.negativeSurprises+" official attempt"+(forecastReview.negativeSurprises===1?" was":"s were")+" a negative directional surprise against a target-ready/strong P17 snapshot.");
  if(calibration.completedWeeks>=3&&calibration.capacitySignal==="commitment_too_high")concerns.push("Weekly commitment size was repeatedly too high for actual execution.");
  if(calibration.totalSacrificeEvents>=2)concerns.push("Protection floors were sacrificed "+calibration.totalSacrificeEvents+" times across completed weekly plans.");

  if(summary.retakePendingCourses)nextSemesterActions.push("Resolve every pending retake decision before allocating new semester capacity.");
  if(summary.retakePlannedCourses)nextSemesterActions.push("Treat planned retakes as first-class courses from week one rather than as leftover study debt.");
  if(forecastReview.negativeSurprises)nextSemesterActions.push("Audit the evidence behind negative P17 surprises: simulation quality, coverage, independence, and exam transfer should be checked before changing thresholds.");
  if(calibration.capacitySignal==="commitment_too_high")nextSemesterActions.push("Start the next semester with a lower weekly course envelope rather than carrying unfinished minutes as debt.");
  if(calibration.capacitySignal==="commitment_too_low")nextSemesterActions.push("The next semester may support a modestly larger weekly course envelope, but keep P10 daily limits authoritative.");
  if(calibration.capacitySignal==="volatile")nextSemesterActions.push("Do not hard-code a new capacity baseline; investigate calendar/workload volatility first.");
  if(summary.unknownCreditCourses)nextSemesterActions.push("Configure missing course credits before using credit-weighted completion as a decision metric.");
  if(!nextSemesterActions.length)nextSemesterActions.push("Carry forward the current planning structure; no semester-level structural correction is supported by the available evidence.");

  const retrospective:SemesterRetrospective={
    status,
    summary:status==="complete"
      ?"All configured courses are terminal and no result/retake decision remains open."
      :status==="results_pending"
        ?"The semester ledger is waiting for one or more official outcomes before it can close."
        :status==="retakes_open"
          ?"The original exam period is partly resolved, but one or more courses remain open through retake decisions."
          :status==="incomplete_data"
            ?"At least one inactive course has no terminal P24 outcome, so the completion ledger is incomplete."
            :"The semester is still operational; this review remains a live progress ledger rather than a final report.",
    forecastReview,
    execution:{
      completedWeeks:calibration.completedWeeks,evidence:calibration.evidence,
      medianWeekAdherencePercent:calibration.medianWeekAdherencePercent,
      capacitySignal:calibration.capacitySignal,rebalancedWeeks:calibration.totalRebalancedWeeks,
      sacrificeEvents:calibration.totalSacrificeEvents,summary:executionSummary,
    },
    strengths,concerns,nextSemesterActions,
  };

  return {
    semester:{...input.semester,today:input.today},
    courses:courseRows,summary,retrospective,
  };
}
