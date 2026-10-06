export type HistoricalPriorRelation="direct_retake"|"prerequisite"|"related";
export type TransferSignal="positive"|"mixed"|"negative"|"unknown";
export type TransferOutcome="confirmed"|"partial"|"contradicted"|"insufficient_evidence";
export type TransferConfidence="low"|"medium"|"high";
export type LongitudinalPattern="insufficient_evidence"|"emerging"|"durable_strength"|"recurring_weakness"|"context_sensitive";

export type PriorSnapshot={
  latestOutcome?:unknown;
  latestScorePercent?:unknown;
  latestReadinessIndex?:unknown;
  latestReadinessBand?:unknown;
  unresolvedFindings?:unknown;
  skillCount?:unknown;
};

export type BaselineEvidence={
  status:string;
  retained:number;
  rusty:number;
  weak:number;
  neverMastered:number;
};

export type EarlyAttempt={
  result:"correct"|"partial"|"incorrect";
  independence:string;
};

export type PriorTransferInput={
  priorId:string;
  courseId:string;
  stableKey:string;
  displayName:string;
  sourceCourseId:string;
  sourceDisplayName:string;
  relation:HistoricalPriorRelation;
  snapshot:PriorSnapshot;
  baseline:BaselineEvidence|null;
  earlyAttempts:EarlyAttempt[];
};

export type PriorTransferEvaluation={
  priorId:string;
  courseId:string;
  stableKey:string;
  displayName:string;
  sourceCourseId:string;
  sourceDisplayName:string;
  relation:HistoricalPriorRelation;
  sourceSignal:TransferSignal;
  currentSignal:TransferSignal;
  outcome:TransferOutcome;
  confidence:TransferConfidence;
  independentAttempts:number;
  baselineClassifications:number;
  recommendation:string;
};

export type RelationReliability={
  relation:HistoricalPriorRelation;
  total:number;
  usable:number;
  confirmed:number;
  partial:number;
  contradicted:number;
  insufficient:number;
  reliabilityPercent:number|null;
};

export type LongitudinalCourseProfile={
  stableKey:string;
  displayName:string;
  usableTransitions:number;
  positiveConfirmations:number;
  negativeConfirmations:number;
  contradictions:number;
  pattern:LongitudinalPattern;
  recommendation:string;
};

const finite=(value:unknown)=>{
  if(value==null||value==="")return null;
  const n=Number(value);
  return Number.isFinite(n)?n:null;
};

const textValue=(value:unknown)=>String(value??"").trim().toLowerCase();

export function sourcePriorSignal(snapshot:PriorSnapshot):TransferSignal{
  const score=finite(snapshot.latestScorePercent);
  const readiness=finite(snapshot.latestReadinessIndex);
  const unresolved=Math.max(0,finite(snapshot.unresolvedFindings)??0);
  const outcome=textValue(snapshot.latestOutcome);
  const band=textValue(snapshot.latestReadinessBand);

  const positiveSignals=[
    score!=null&&score>=75,
    readiness!=null&&readiness>=75,
    /pass|passed|complete|completed|strong|ready/.test(outcome),
    /ready|strong|high/.test(band),
  ].filter(Boolean).length;
  const negativeSignals=[
    score!=null&&score<60,
    readiness!=null&&readiness<60,
    /fail|failed|retake|weak|critical/.test(outcome),
    /weak|critical|not_ready|not ready|low/.test(band),
    unresolved>=3,
  ].filter(Boolean).length;

  if(positiveSignals===0&&negativeSignals===0)return "unknown";
  if(positiveSignals>0&&negativeSignals===0)return "positive";
  if(negativeSignals>0&&positiveSignals===0)return "negative";
  if(positiveSignals>=negativeSignals+2)return "positive";
  if(negativeSignals>=positiveSignals+2)return "negative";
  return "mixed";
}

export function baselineSignal(baseline:BaselineEvidence|null):TransferSignal{
  if(!baseline||baseline.status!=="completed")return "unknown";
  const total=baseline.retained+baseline.rusty+baseline.weak+baseline.neverMastered;
  if(total<2)return "unknown";
  const retained=baseline.retained/total;
  const weak=(baseline.weak+baseline.neverMastered)/total;
  if(retained>=.65&&weak<=.2)return "positive";
  if(weak>=.45)return "negative";
  return "mixed";
}

export function earlyAttemptSignal(attempts:EarlyAttempt[]):{signal:TransferSignal;independentAttempts:number}{
  const rows=attempts.filter((row)=>row.independence==="independent");
  if(rows.length<4)return {signal:"unknown",independentAttempts:rows.length};
  const score=rows.reduce((sum,row)=>sum+(row.result==="correct"?1:row.result==="partial"?.5:0),0)/rows.length;
  if(score>=.75)return {signal:"positive",independentAttempts:rows.length};
  if(score<.55)return {signal:"negative",independentAttempts:rows.length};
  return {signal:"mixed",independentAttempts:rows.length};
}

export function combineCurrentSignal(baseline:TransferSignal,attempts:TransferSignal):TransferSignal{
  if(baseline==="unknown")return attempts;
  if(attempts==="unknown")return baseline;
  if(baseline===attempts)return baseline;
  if(baseline==="mixed")return attempts;
  if(attempts==="mixed")return baseline;
  return "mixed";
}

function transferOutcome(source:TransferSignal,current:TransferSignal):TransferOutcome{
  if(source==="unknown"||current==="unknown")return "insufficient_evidence";
  if(source==="mixed"||current==="mixed")return "partial";
  return source===current?"confirmed":"contradicted";
}

function confidenceFor(baselineCount:number,independentAttempts:number,outcome:TransferOutcome):TransferConfidence{
  if(outcome==="insufficient_evidence")return "low";
  if(baselineCount>=4&&independentAttempts>=8)return "high";
  if(baselineCount>=2||independentAttempts>=6)return "medium";
  return "low";
}

function recommendationFor(source:TransferSignal,current:TransferSignal,outcome:TransferOutcome){
  if(outcome==="insufficient_evidence")return "Keep the prior advisory. Complete the fresh baseline or collect at least four independent early attempts before judging transfer.";
  if(outcome==="contradicted")return "The historical signal did not transfer cleanly. Down-weight this prior for diagnosis and follow current-semester evidence.";
  if(outcome==="partial")return "The transfer signal is mixed. Use the prior only to choose what to verify next; do not infer mastery from it.";
  if(source==="positive"&&current==="positive")return "The historical strength appears to have transferred, but current-semester evidence remains authoritative.";
  return "The historical weakness appears to be recurring. Prioritize targeted verification and repair without restoring old mastery state.";
}

export function evaluatePriorTransfer(input:PriorTransferInput):PriorTransferEvaluation{
  const sourceSignal=sourcePriorSignal(input.snapshot);
  const baseSignal=baselineSignal(input.baseline);
  const attempt=earlyAttemptSignal(input.earlyAttempts);
  const currentSignal=combineCurrentSignal(baseSignal,attempt.signal);
  const outcome=transferOutcome(sourceSignal,currentSignal);
  const baselineClassifications=input.baseline?.status==="completed"
    ?input.baseline.retained+input.baseline.rusty+input.baseline.weak+input.baseline.neverMastered
    :0;
  return {
    priorId:input.priorId,courseId:input.courseId,stableKey:input.stableKey,displayName:input.displayName,
    sourceCourseId:input.sourceCourseId,sourceDisplayName:input.sourceDisplayName,relation:input.relation,
    sourceSignal,currentSignal,outcome,
    confidence:confidenceFor(baselineClassifications,attempt.independentAttempts,outcome),
    independentAttempts:attempt.independentAttempts,baselineClassifications,
    recommendation:recommendationFor(sourceSignal,currentSignal,outcome),
  };
}

const RELATIONS:HistoricalPriorRelation[]=["direct_retake","prerequisite","related"];

export function summarizeRelationReliability(evaluations:PriorTransferEvaluation[]):RelationReliability[]{
  return RELATIONS.map((relation)=>{
    const rows=evaluations.filter((row)=>row.relation===relation);
    const usable=rows.filter((row)=>row.outcome!=="insufficient_evidence");
    const confirmed=usable.filter((row)=>row.outcome==="confirmed").length;
    const partial=usable.filter((row)=>row.outcome==="partial").length;
    const contradicted=usable.filter((row)=>row.outcome==="contradicted").length;
    return {
      relation,total:rows.length,usable:usable.length,confirmed,partial,contradicted,
      insufficient:rows.length-usable.length,
      reliabilityPercent:usable.length?Math.round((confirmed+partial*.5)/usable.length*100):null,
    };
  });
}

export function buildLongitudinalProfiles(evaluations:PriorTransferEvaluation[]):LongitudinalCourseProfile[]{
  const confidenceRank:Record<TransferConfidence,number>={low:0,medium:1,high:2};
  const transitionMap=new Map<string,PriorTransferEvaluation>();
  for(const row of evaluations.filter((item)=>item.relation==="direct_retake")){
    const key=row.stableKey+"::"+row.courseId;
    const current=transitionMap.get(key);
    if(!current
      || (current.outcome==="insufficient_evidence"&&row.outcome!=="insufficient_evidence")
      || confidenceRank[row.confidence]>confidenceRank[current.confidence]
    ) transitionMap.set(key,row);
  }
  const groups=new Map<string,PriorTransferEvaluation[]>();
  for(const row of transitionMap.values())groups.set(row.stableKey,[...(groups.get(row.stableKey)??[]),row]);

  return [...groups.entries()].map(([stableKey,rows])=>{
    const usable=rows.filter((row)=>row.outcome!=="insufficient_evidence");
    const positiveConfirmations=usable.filter((row)=>row.outcome==="confirmed"&&row.sourceSignal==="positive"&&row.currentSignal==="positive").length;
    const negativeConfirmations=usable.filter((row)=>row.outcome==="confirmed"&&row.sourceSignal==="negative"&&row.currentSignal==="negative").length;
    const contradictions=usable.filter((row)=>row.outcome==="contradicted").length;
    let pattern:LongitudinalPattern=usable.length?"emerging":"insufficient_evidence";
    if(usable.length>=2&&positiveConfirmations/usable.length>=.67)pattern="durable_strength";
    else if(usable.length>=2&&negativeConfirmations/usable.length>=.67)pattern="recurring_weakness";
    else if(usable.length>=2&&contradictions/usable.length>=.5)pattern="context_sensitive";

    let recommendation="Collect another cross-semester transition before treating this as a durable pattern.";
    if(pattern==="insufficient_evidence")recommendation="The course history exists, but current evidence is still too sparse for a longitudinal conclusion.";
    if(pattern==="durable_strength")recommendation="Strength has repeated across semesters. Preserve spaced verification, but do not reduce current mastery standards.";
    if(pattern==="recurring_weakness")recommendation="Weakness has repeated across semesters. Treat it as a durable study-risk signal and change method early.";
    if(pattern==="context_sensitive")recommendation="Historical performance is not predicting the new semester reliably. Treat the prior as context-specific rather than durable.";
    return {
      stableKey,displayName:rows.at(-1)?.displayName??stableKey,usableTransitions:usable.length,
      positiveConfirmations,negativeConfirmations,contradictions,pattern,recommendation,
    };
  }).sort((a,b)=>a.displayName.localeCompare(b.displayName));
}
