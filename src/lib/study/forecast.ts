export type ReadinessBand="insufficient_evidence"|"at_risk"|"fragile"|"pass_ready"|"target_ready"|"strong";
export type ForecastConfidence="very_low"|"low"|"medium"|"high";
export type ForecastTrajectory="unknown"|"improving"|"stable"|"declining";
export type RunwayBand="unknown"|"ample"|"workable"|"compressed"|"urgent"|"passed";
export type DecisionActionKind=
  |"collect_evidence"|"coursework"|"retention"|"drift_repair"|"strategy_experiment"
  |"change_source"|"external_support"|"exam_strategy"|"maintain";

export type ForecastComponent={
  key:string;
  label:string;
  value:number;
  weight:number;
  contribution:number;
};

export type DecisionAction={
  kind:DecisionActionKind;
  title:string;
  reason:string;
  href:string;
  estimatedMinutes:number;
  expectedValue:number;
  authority:"P17"|"P16"|"P14"|"P13"|"P9"|"P8";
};

export type ForecastInput={
  courseId:string;
  displayName:string;
  shortName:string|null;
  courseKind:string;
  credits:number|null;
  totalSkills:number;
  testedSkills:number;
  coveragePercent:number|null;
  durableMasteryPercent:number|null;
  examReadyPercent:number|null;
  independentSuccessPercent:number|null;
  riskScore:number;
  riskBand:string;
  actionableBacklog:number;
  dueOrAtRiskSkills:number;
  unresolvedErrors:number;
  operatingMode:string|null;
  daysToExam:number|null;

  calibrationStatus:"uncalibrated"|"emerging"|"usable"|"established"|null;
  calibrationAccuracyPercent:number|null;
  calibrationIndependentAttempts:number;
  calibrationNeeds:boolean;

  driftBand:"insufficient_data"|"on_track"|"watch"|"drifting"|"critical"|null;
  driftSufficient:boolean;
  driftScore:number;
  driftAccuracyDelta:number|null;
  driftCorrectionKind:"none"|"rebalance_existing"|"targeted_practice"|null;
  driftCorrectionMinutes:number;

  difficultySignal:"insufficient_evidence"|"transient"|"responsive"|"persistent"|"structural"|null;
  evaluatedInterventions:number;
  interventionEffectivenessRate:number|null;
  latestInterventionOutcome:"pending"|"insufficient_evidence"|"effective"|"unchanged"|"regressed"|null;

  strategyAwaitingEvidence:boolean;
  strategyRecommendedKey:string|null;
  strategyRecommendedTitle:string|null;
  strategyRecommendedMinutes:number|null;
  strategyEscalation:"none"|"change_source"|"external_support"|null;
  strategyProvenCount:number;
  strategyPromisingCount:number;
  strategyRetiredCount:number;

  processedExams:number;
  simulatableExams:number;
  blueprintConfidence:"low"|"medium"|"high"|null;
  verifiedSolutionCoveragePercent:number|null;
  lastVerifiedScorePercent:number|null;
  lastVerifiedCoveragePercent:number|null;
  examNextAction:string|null;
  examNextActionReason:string|null;
  examStrategyDurationMinutes:number|null;
};

export type CourseForecast={
  courseId:string;
  displayName:string;
  shortName:string|null;
  courseKind:string;
  credits:number|null;
  readinessIndex:number|null;
  provisionalIndex:number;
  readinessRange:{low:number;high:number}|null;
  band:ReadinessBand;
  confidence:ForecastConfidence;
  evidenceScore:number;
  trajectory:ForecastTrajectory;
  runway:RunwayBand;
  decisionPriority:number;
  components:ForecastComponent[];
  blockers:string[];
  supports:string[];
  summary:string;
  nextAction:DecisionAction;
};

export type SemesterForecastSummary={
  courseCount:number;
  scoredCourses:number;
  weightedReadinessIndex:number|null;
  atRiskCourses:number;
  fragileCourses:number;
  passReadyCourses:number;
  targetReadyCourses:number;
  strongCourses:number;
  insufficientEvidenceCourses:number;
  highConfidenceCourses:number;
  improvingCourses:number;
  decliningCourses:number;
  topPriorityCourseId:string|null;
};

const clamp=(value:number,min=0,max=100)=>Math.min(max,Math.max(min,value));
const num=(value:number|null|undefined,fallback=0)=>value==null||!Number.isFinite(Number(value))?fallback:Number(value);

function confidenceFromEvidence(score:number):ForecastConfidence{
  if(score<25)return "very_low";
  if(score<45)return "low";
  if(score<70)return "medium";
  return "high";
}

function runwayBand(days:number|null):RunwayBand{
  if(days==null)return "unknown";
  if(days<0)return "passed";
  if(days<=7)return "urgent";
  if(days<=21)return "compressed";
  if(days<=56)return "workable";
  return "ample";
}

function evidenceScore(input:ForecastInput){
  let score=0;
  if(input.totalSkills>0){
    score+=10;
    score+=Math.min(20,(input.testedSkills/Math.max(1,input.totalSkills))*20);
  }
  if(num(input.coveragePercent)>=50)score+=5;
  const statusPoints={uncalibrated:0,emerging:5,usable:11,established:16} as const;
  if(input.calibrationStatus)score+=statusPoints[input.calibrationStatus];
  score+=Math.min(9,input.calibrationIndependentAttempts*0.75);
  if(input.driftSufficient)score+=10;
  score+=Math.min(8,input.evaluatedInterventions*4);
  if(input.processedExams>=1)score+=4;
  if(input.processedExams>=2)score+=3;
  if(input.blueprintConfidence==="medium")score+=5;
  if(input.blueprintConfidence==="high")score+=8;
  if(input.lastVerifiedScorePercent!=null){
    score+=num(input.lastVerifiedCoveragePercent)>=70?18:10;
  }
  if(input.strategyProvenCount||input.strategyPromisingCount||input.strategyRetiredCount)score+=4;
  return Math.round(clamp(score));
}

function addComponent(
  components:ForecastComponent[],
  key:string,label:string,value:number|null|undefined,weight:number,
){
  if(value==null||!Number.isFinite(Number(value)))return;
  const clean=clamp(Number(value));
  components.push({key,label,value:Math.round(clean),weight,contribution:clean*weight});
}

function readinessBase(input:ForecastInput){
  const components:ForecastComponent[]=[];
  const strongSimulation=input.lastVerifiedScorePercent!=null&&num(input.lastVerifiedCoveragePercent)>=70;
  if(strongSimulation){
    addComponent(components,"durable","Durable mastery",input.durableMasteryPercent,0.20);
    addComponent(components,"exam_ready","Exam-ready skills",input.examReadyPercent,0.22);
    addComponent(components,"recent","Recent independent success",input.independentSuccessPercent,0.10);
    if(input.calibrationStatus==="usable"||input.calibrationStatus==="established"){
      addComponent(components,"calibration","Calibrated accuracy",input.calibrationAccuracyPercent,0.05);
    }
    addComponent(components,"coverage","Syllabus coverage",input.coveragePercent,0.10);
    addComponent(components,"simulation","Verified timed simulation",input.lastVerifiedScorePercent,0.33);
  }else{
    addComponent(components,"durable","Durable mastery",input.durableMasteryPercent,0.28);
    addComponent(components,"exam_ready","Exam-ready skills",input.examReadyPercent,0.24);
    addComponent(components,"recent","Recent independent success",input.independentSuccessPercent,0.16);
    if(input.calibrationStatus==="usable"||input.calibrationStatus==="established"){
      addComponent(components,"calibration","Calibrated accuracy",input.calibrationAccuracyPercent,0.12);
    }
    addComponent(components,"coverage","Syllabus coverage",input.coveragePercent,0.12);
    if(input.lastVerifiedScorePercent!=null){
      addComponent(components,"simulation","Verified timed simulation",input.lastVerifiedScorePercent,0.18);
    }
  }
  const weight=components.reduce((sum,item)=>sum+item.weight,0);
  const base=weight?components.reduce((sum,item)=>sum+item.contribution,0)/weight:0;
  return {base,components};
}

function trajectory(input:ForecastInput):ForecastTrajectory{
  let evidence=0,score=0;
  if(input.driftSufficient&&input.driftAccuracyDelta!=null){
    evidence++;
    if(input.driftAccuracyDelta>=8)score+=2;
    else if(input.driftAccuracyDelta<=-8)score-=2;
  }
  if(input.latestInterventionOutcome){
    if(["effective"].includes(input.latestInterventionOutcome)){score+=1;evidence++;}
    else if(["unchanged","regressed"].includes(input.latestInterventionOutcome)){score+=input.latestInterventionOutcome==="regressed"?-2:-1;evidence++;}
  }
  if(input.strategyProvenCount){score+=1;evidence++;}
  if(input.strategyEscalation==="external_support"){score-=1;evidence++;}
  if(!evidence)return "unknown";
  if(score>=2)return "improving";
  if(score<=-2)return "declining";
  return "stable";
}

function bandFromIndex(index:number,evidence:number):ReadinessBand{
  if(evidence<35)return "insufficient_evidence";
  if(index<50)return "at_risk";
  if(index<65)return "fragile";
  if(index<80)return "pass_ready";
  if(index<90)return "target_ready";
  return "strong";
}

function rangeFor(index:number,confidence:ForecastConfidence){
  const width={very_low:22,low:16,medium:10,high:6}[confidence];
  return {low:Math.round(clamp(index-width)),high:Math.round(clamp(index+width))};
}

function examActionLabel(action:string){
  return ({
    process_past_exams:"Process past-exam evidence",
    add_exam_evidence:"Add another representative past exam",
    baseline_timed_paper:"Run baseline timed paper",
    timed_paper:"Run timed paper",
    verify_solutions:"Verify exam solutions",
    repair_weaknesses:"Repair exam weaknesses",
    mixed_exam_practice:"Run mixed exam practice",
  } as Record<string,string>)[action]??action.replaceAll("_"," ");
}

function examActionMinutes(input:ForecastInput){
  const action=input.examNextAction;
  if(action==="baseline_timed_paper"||action==="timed_paper")return Math.max(30,Math.round(num(input.examStrategyDurationMinutes,90)));
  if(action==="repair_weaknesses"||action==="mixed_exam_practice")return 45;
  if(action==="verify_solutions")return 30;
  return 20;
}

function chooseNextAction(input:ForecastInput,readiness:number,evidence:number,runway:RunwayBand):DecisionAction{
  if(input.operatingMode==="post_exam"||runway==="passed"){
    return {
      kind:"maintain",title:"Exam complete — no further allocation",
      reason:"The configured exam has passed. P17 removes this course from active semester-allocation pressure.",
      href:"/courses/"+input.courseId,estimatedMinutes:0,expectedValue:0,authority:"P17",
    };
  }
  const candidates:DecisionAction[]=[];
  const add=(action:DecisionAction)=>candidates.push({...action,expectedValue:Math.round(clamp(action.expectedValue))});

  if(input.operatingMode==="transition"||input.operatingMode==="exam"){
    if(input.examNextAction&&input.examNextAction!=="maintain_blueprint"){
      add({
        kind:"exam_strategy",title:examActionLabel(input.examNextAction),
        reason:input.examNextActionReason??"P9 exam strategy is authoritative once the course enters transition/exam mode.",
        href:"/courses/"+input.courseId,estimatedMinutes:examActionMinutes(input),
        expectedValue:94+(runway==="urgent"?6:runway==="compressed"?3:0),authority:"P9",
      });
    }
  }

  if(evidence<35){
    if(input.calibrationNeeds){
      add({
        kind:"collect_evidence",title:"Run a calibration set",
        reason:"The forecast is evidence-limited. A short independent sample is more valuable than increasing the precision of an unsupported forecast.",
        href:"/practice?mode=calibration&course="+input.courseId,estimatedMinutes:20,expectedValue:92,authority:"P13",
      });
    }
    if(num(input.coveragePercent)<50){
      add({
        kind:"coursework",title:"Close the source-coverage gap",
        reason:"Too little of the current syllabus is represented to make a trustworthy outcome call.",
        href:"/courses/"+input.courseId,estimatedMinutes:20,expectedValue:86,authority:"P17",
      });
    }
    if(input.daysToExam!=null&&input.daysToExam<=60&&input.processedExams===0){
      add({
        kind:"collect_evidence",title:"Process one representative past exam",
        reason:"The exam is approaching but P9 has no historical exam evidence yet.",
        href:"/courses/"+input.courseId,estimatedMinutes:20,expectedValue:88,authority:"P9",
      });
    }
  }

  const escalated=input.difficultySignal==="persistent"||input.difficultySignal==="structural";
  if(escalated){
    if(input.strategyAwaitingEvidence){
      add({
        kind:"coursework",title:"Collect clean transfer evidence",
        reason:"A P16 method experiment is still unresolved. Normal independent work is the highest-value next evidence; starting another experiment would confound the comparison.",
        href:"/courses/"+input.courseId,estimatedMinutes:20,expectedValue:89,authority:"P16",
      });
    }else if(input.strategyEscalation==="external_support"){
      add({
        kind:"external_support",title:"Escalate with the exact failed skills",
        reason:"The in-app method portfolio is exhausted. Additional solo repetitions have lower expected value than qualified external feedback.",
        href:"/strategy?course="+input.courseId,estimatedMinutes:15,expectedValue:93,authority:"P16",
      });
    }else if(input.strategyRecommendedKey){
      add({
        kind:input.strategyEscalation==="change_source"?"change_source":"strategy_experiment",
        title:(input.strategyEscalation==="change_source"?"Change source + ":"Run ")+(input.strategyRecommendedTitle??input.strategyRecommendedKey.replaceAll("_"," ")),
        reason:input.strategyEscalation==="change_source"
          ?"Multiple methods failed; change the representation/source while testing the next method."
          :"P16 selected a different learning mechanism based on the observed failure pattern and prior transfer.",
        href:input.strategyEscalation==="change_source"
          ?"/strategy?course="+input.courseId
          :"/practice?mode=strategy&course="+input.courseId+"&strategy="+input.strategyRecommendedKey,
        estimatedMinutes:Math.max(15,num(input.strategyRecommendedMinutes,20)),expectedValue:90,authority:"P16",
      });
    }
  }

  if(!escalated&&input.driftCorrectionKind==="targeted_practice"&&input.driftCorrectionMinutes>0){
    add({
      kind:"drift_repair",title:"Run targeted drift repair",
      reason:"P14 detected a completed-week performance/workload drift that can still be corrected with the existing repair mechanism.",
      href:"/practice?mode=drift&course="+input.courseId,
      estimatedMinutes:input.driftCorrectionMinutes,
      expectedValue:82+(input.driftBand==="critical"?7:input.driftBand==="drifting"?4:0),authority:"P14",
    });
  }

  if(input.dueOrAtRiskSkills>0){
    add({
      kind:"retention",title:"Clear due high-value retention",
      reason:input.dueOrAtRiskSkills+" skill"+(input.dueOrAtRiskSkills===1?" is":"s are")+" due or at risk; protecting durable mastery has high carry-over value.",
      href:"/practice",estimatedMinutes:Math.min(40,Math.max(15,input.dueOrAtRiskSkills*5)),
      expectedValue:72+Math.min(12,input.dueOrAtRiskSkills*2),authority:"P8",
    });
  }

  if(input.actionableBacklog>0||num(input.coveragePercent)<80){
    add({
      kind:"coursework",title:"Advance the current course workflow",
      reason:input.actionableBacklog>0
        ?input.actionableBacklog+" actionable weekly item"+(input.actionableBacklog===1?" is":"s are")+" still open."
        :"Syllabus coverage is below the readiness target.",
      href:"/courses/"+input.courseId,estimatedMinutes:30,
      expectedValue:70+Math.min(12,input.actionableBacklog*3)+(num(input.coveragePercent)<60?5:0),authority:"P17",
    });
  }

  if(!candidates.length||readiness>=80){
    add({
      kind:"maintain",title:"Maintain the current loop",
      reason:readiness>=80
        ?"Current readiness is on the high-performance path; protect it with ordinary coursework, retention, and P9 exam work as scheduled."
        :"No higher-value exception is currently supported by the evidence.",
      href:"/courses/"+input.courseId,estimatedMinutes:20,expectedValue:50,authority:"P17",
    });
  }

  return candidates.sort((a,b)=>b.expectedValue-a.expectedValue||a.estimatedMinutes-b.estimatedMinutes)[0];
}

export function buildCourseForecast(input:ForecastInput):CourseForecast{
  const evidence=evidenceScore(input);
  const confidence=confidenceFromEvidence(evidence);
  const {base,components}=readinessBase(input);
  const riskPenalty=Math.min(8,num(input.riskScore)*0.08);
  const driftPenalty=({insufficient_data:0,on_track:0,watch:2,drifting:5,critical:8} as Record<string,number>)[input.driftBand??""]??0;
  const difficultyAdjustment=({insufficient_evidence:0,transient:1,responsive:2,persistent:-4,structural:-7} as Record<string,number>)[input.difficultySignal??""]??0;
  const provisional=Math.round(clamp(base-riskPenalty-driftPenalty+difficultyAdjustment));
  const band=bandFromIndex(provisional,evidence);
  const readinessIndex=band==="insufficient_evidence"?null:provisional;
  const currentTrajectory=trajectory(input);
  const runway=runwayBand(input.daysToExam);
  const range=readinessIndex==null?null:rangeFor(readinessIndex,confidence);

  const blockers:string[]=[];
  const supports:string[]=[];
  if(evidence<35)blockers.push("Forecast evidence is still too thin for a readiness call.");
  if(num(input.coveragePercent)<60)blockers.push("Syllabus coverage is below 60%.");
  if(input.driftBand==="drifting"||input.driftBand==="critical")blockers.push("Completed-week performance is drifting.");
  if(input.difficultySignal==="persistent"||input.difficultySignal==="structural")blockers.push("Recent repair methods have not transferred reliably.");
  if(input.lastVerifiedScorePercent!=null&&num(input.lastVerifiedCoveragePercent)<70)blockers.push("Latest timed-paper score is not broadly verified enough to anchor the forecast.");
  if(runway==="urgent"&&provisional<80)blockers.push("Exam runway is under eight days.");
  if(num(input.durableMasteryPercent)>=75)supports.push("Durable mastery is strong.");
  if(num(input.examReadyPercent)>=75)supports.push("Most mapped skills are exam-ready.");
  if(num(input.independentSuccessPercent)>=75)supports.push("Recent independent success is strong.");
  if(input.lastVerifiedScorePercent!=null&&num(input.lastVerifiedCoveragePercent)>=70)supports.push("A broadly verified timed paper anchors exam transfer.");
  if(input.difficultySignal==="responsive"||input.strategyProvenCount>0)supports.push("Recent interventions have demonstrated transfer.");
  if(currentTrajectory==="improving")supports.push("Recent evidence is improving.");

  const urgency=runway==="urgent"?18:runway==="compressed"?10:runway==="workable"?4:0;
  const trajectoryPressure=currentTrajectory==="declining"?10:currentTrajectory==="improving"?-5:0;
  const structuralPressure=input.difficultySignal==="structural"?12:input.difficultySignal==="persistent"?7:0;
  const evidencePressure=evidence<35?12:0;
  const activeDecisionPriority=Math.round(clamp((100-provisional)*0.55+num(input.riskScore)*0.25+urgency+trajectoryPressure+structuralPressure+evidencePressure));
  const decisionPriority=input.operatingMode==="post_exam"||runway==="passed"?0:activeDecisionPriority;

  const nextAction=chooseNextAction(input,provisional,evidence,runway);
  const summary=band==="insufficient_evidence"
    ?"Not enough independent, longitudinal, or exam-transfer evidence exists for a defensible readiness classification."
    :band==="at_risk"
      ?"Current StudyOS readiness is materially below the exam-readiness target and needs active recovery."
      :band==="fragile"
        ?"There is meaningful progress, but current readiness remains too fragile to treat the exam outcome as secure."
        :band==="pass_ready"
          ?"Current evidence supports a pass-ready trajectory, but it is still below the high-performance target."
          :band==="target_ready"
            ?"Current evidence is consistent with the high-performance target if transfer and retention hold."
            :"Current evidence is strong across the available readiness signals; protect it rather than adding unnecessary volume.";

  return {
    courseId:input.courseId,displayName:input.displayName,shortName:input.shortName,courseKind:input.courseKind,credits:input.credits,
    readinessIndex,provisionalIndex:provisional,readinessRange:range,band,confidence,evidenceScore:evidence,
    trajectory:currentTrajectory,runway,decisionPriority,components,blockers,supports,summary,nextAction,
  };
}

export function summarizeSemesterForecast(courses:CourseForecast[]):SemesterForecastSummary{
  const scored=courses.filter((course)=>course.readinessIndex!=null);
  const weighted=scored.reduce((sum,course)=>sum+Number(course.readinessIndex)*(course.credits&&course.credits>0?course.credits:1),0);
  const weights=scored.reduce((sum,course)=>sum+(course.credits&&course.credits>0?course.credits:1),0);
  const top=[...courses].sort((a,b)=>b.decisionPriority-a.decisionPriority)[0]??null;
  return {
    courseCount:courses.length,scoredCourses:scored.length,weightedReadinessIndex:weights?Math.round(weighted/weights):null,
    atRiskCourses:courses.filter((course)=>course.band==="at_risk").length,
    fragileCourses:courses.filter((course)=>course.band==="fragile").length,
    passReadyCourses:courses.filter((course)=>course.band==="pass_ready").length,
    targetReadyCourses:courses.filter((course)=>course.band==="target_ready").length,
    strongCourses:courses.filter((course)=>course.band==="strong").length,
    insufficientEvidenceCourses:courses.filter((course)=>course.band==="insufficient_evidence").length,
    highConfidenceCourses:courses.filter((course)=>course.confidence==="high").length,
    improvingCourses:courses.filter((course)=>course.trajectory==="improving").length,
    decliningCourses:courses.filter((course)=>course.trajectory==="declining").length,
    topPriorityCourseId:top?.courseId??null,
  };
}
