export type ExamResultStatus="provisional"|"official";
export type ExamOutcome="passed"|"failed"|"absent"|"withdrawn";
export type RetakeDecision="not_applicable"|"pending"|"planned"|"declined";
export type OutcomeAlignment="provisional"|"insufficient_evidence"|"aligned"|"positive_surprise"|"negative_surprise"|"mixed";
export type StructuralResultAction="none"|"complete_course"|"retake_pending"|"retake_planned"|"close_without_pass";

export type ResultSnapshot={
  readinessIndex:number|null;
  readinessBand:string|null;
  decisionPriority:number|null;
  confidence?:string|null;
};

export function reconcileExamOutcome(input:{
  resultStatus:ExamResultStatus;
  outcome:ExamOutcome;
  snapshot:ResultSnapshot;
}):{alignment:OutcomeAlignment;summary:string}{
  if(input.resultStatus==="provisional"){
    return {alignment:"provisional",summary:"The result is provisional, so StudyOS records it without treating it as a completed outcome."};
  }
  const readiness=input.snapshot.readinessIndex;
  const weakEvidence=readiness==null||input.snapshot.readinessBand==="insufficient_evidence"||input.snapshot.confidence==="very_low";
  if(weakEvidence){
    return {alignment:"insufficient_evidence",summary:"The pre-exam P17 evidence was too limited for a meaningful directional comparison."};
  }

  if(input.outcome==="passed"){
    if(readiness<65){
      return {alignment:"positive_surprise",summary:"The course passed despite a fragile/at-risk readiness signal. This is a positive directional surprise, not evidence that P17 predicted a grade incorrectly."};
    }
    return {alignment:"aligned",summary:"The passing outcome is directionally consistent with the pre-exam readiness evidence."};
  }

  if(readiness>=80){
    return {alignment:"negative_surprise",summary:"The non-passing outcome conflicts with a target-ready-or-strong readiness signal and should be treated as a model/evidence review case."};
  }
  if(readiness<65){
    return {alignment:"aligned",summary:"The non-passing outcome is directionally consistent with the fragile/at-risk pre-exam readiness evidence."};
  }
  return {alignment:"mixed",summary:"The result sits between the clear directional cases. StudyOS should retain the evidence without over-interpreting the readiness score."};
}

export function structuralResultAction(input:{
  resultStatus:ExamResultStatus;
  outcome:ExamOutcome;
  retakeDecision:RetakeDecision;
}):StructuralResultAction{
  if(input.resultStatus!=="official")return "none";
  if(input.outcome==="passed")return "complete_course";
  if(input.retakeDecision==="planned")return "retake_planned";
  if(input.retakeDecision==="pending")return "retake_pending";
  if(input.retakeDecision==="declined")return "close_without_pass";
  return "none";
}

export function resultBlocksCoursePlanning(input:{
  resultStatus:string;
  outcome:string;
  retakeDecision:string;
}){
  if(input.resultStatus!=="official")return false;
  if(input.outcome==="passed")return true;
  return input.retakeDecision==="pending"||input.retakeDecision==="declined";
}

export function validateResultDraft(input:{
  attemptNo:number;
  resultStatus:string;
  outcome:string;
  scorePercent:number|null;
  retakeDecision:string;
  nextExamAt:string|null;
  examAt:string;
  nowIso:string;
}):string|null{
  if(!Number.isInteger(input.attemptNo)||input.attemptNo<1||input.attemptNo>10)return "Attempt number must be between 1 and 10.";
  if(!["provisional","official"].includes(input.resultStatus))return "Invalid result status.";
  if(!["passed","failed","absent","withdrawn"].includes(input.outcome))return "Invalid exam outcome.";
  if(input.scorePercent!=null&&(!Number.isFinite(input.scorePercent)||input.scorePercent<0||input.scorePercent>100))return "Score must be between 0 and 100.";
  if(Number.isNaN(Date.parse(input.examAt))||Date.parse(input.examAt)>Date.parse(input.nowIso))return "The result must refer to an exam that has already started.";
  if(input.outcome==="passed"){
    if(input.retakeDecision!=="not_applicable"||input.nextExamAt)return "Passed results cannot have a retake.";
    return null;
  }
  if(!["pending","planned","declined"].includes(input.retakeDecision))return "A non-passing outcome requires a retake decision.";
  if(input.retakeDecision==="planned"){
    if(!input.nextExamAt||Number.isNaN(Date.parse(input.nextExamAt)))return "A planned retake needs a future exam date.";
    if(Date.parse(input.nextExamAt)<=Date.parse(input.examAt)||Date.parse(input.nextExamAt)<=Date.parse(input.nowIso))return "The retake must be in the future and after the completed attempt.";
  }else if(input.nextExamAt){
    return "A next exam date is only valid for a planned retake.";
  }
  return null;
}
