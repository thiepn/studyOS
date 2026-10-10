import type { StudyIndependence } from "@/lib/supabase/database.types";

export type PracticeStep = "solve" | "compare" | "record";
export type PracticePhase = "answering" | "grading" | "submitting";

const SESSION_LABELS:Record<string,string>={
  review:"Spaced retrieval",checkpoint:"Cumulative checkpoint",
  relearning:"Targeted repair",coursework:"Coursework practice",
  exam_simulation:"Exam practice",
};

export function practiceGuide(input:{
  phase:PracticePhase;
  sessionType:string;
  independence:StudyIndependence;
  seconds:number;
  expectedMinutes:number;
  surface:"typed"|"paper";
  completedQuestions:number;
  totalQuestions:number;
  queuedAttempts:number;
}){
  const step:PracticeStep=input.phase==="answering"?"solve":input.phase==="grading"?"compare":"record";
  const sessionLabel=SESSION_LABELS[input.sessionType]??"Independent study";
  const independenceLabel=input.independence==="solution_exposed"
    ?"Solution revealed before lock · no mastery credit"
    :input.independence==="hint_2"?"Second hint used · assisted attempt"
    :input.independence==="hint_1"?"First hint used · assisted attempt"
    :"No hints or solutions revealed before lock";
  const sourceMessage=input.phase==="answering"
    ?"Work independently and choose confidence before comparing."
    :input.phase==="grading"
      ?"Your answer and confidence are locked. Compare with a qualified source, diagnose mistakes, then save."
      :"Saving the locked attempt. Do not leave until the outcome is recorded or queued.";
  const duration=Math.max(0,Math.floor(input.seconds));
  const target=Math.max(1,Math.ceil(input.expectedMinutes))*60;
  return {
    step,sessionLabel,independenceLabel,sourceMessage,
    elapsedMinutes:Math.floor(duration/60),
    exceedsTarget:duration>target,
    targetMinutes:Math.max(1,Math.ceil(input.expectedMinutes)),
    completedQuestions:Math.max(0,Math.min(input.totalQuestions,input.completedQuestions)),
    totalQuestions:Math.max(0,input.totalQuestions),
    queuedAttempts:Math.max(0,input.queuedAttempts),
    workSurface:input.surface==="paper"?"Paper work":"Typed reasoning",
    // A target is a guide, not a deadline; time does not change grading.
  };
}
