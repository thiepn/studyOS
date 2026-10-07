import type { SemesterCompletionState } from "./semester-completion";

export type RolloverBlockerCode=
  |"no_active_semester"
  |"open_commitments"
  |"pending_retake_decisions"
  |"pending_results"
  |"ongoing_courses"
  |"incomplete_course_state";

export type RolloverCourse={
  courseId:string;
  displayName:string;
  shortName:string|null;
  completionState:SemesterCompletionState;
  credits:number|null;
  nextExamAt:string|null;
};

export type RolloverPreflight={
  eligible:boolean;
  blockers:Array<{code:RolloverBlockerCode;message:string;count:number}>;
  carryCourses:RolloverCourse[];
  terminalCourses:number;
  archivedOnlyCourses:number;
  staleCalendarBlocks:number;
};

export function evaluateRolloverPreflight(input:{
  active:boolean;
  courses:RolloverCourse[];
  openCommitments:number;
  futureCalendarBlocks:number;
}):RolloverPreflight{
  const blockers:RolloverPreflight["blockers"]=[];
  const states=input.courses.map(course=>course.completionState);
  const pendingRetakes=states.filter(state=>state==="retake_pending").length;
  const pendingResults=states.filter(state=>state==="provisional_result"||state==="awaiting_result").length;
  const ongoing=states.filter(state=>state==="ongoing").length;
  const incomplete=states.filter(state=>state==="inactive_unresolved").length;

  if(!input.active)blockers.push({code:"no_active_semester",count:1,message:"The selected source semester is not active."});
  if(input.openCommitments>0)blockers.push({
    code:"open_commitments",count:input.openCommitments,
    message:"Resolve open real commitments before archiving; StudyOS never silently drops or copies them.",
  });
  if(pendingRetakes>0)blockers.push({
    code:"pending_retake_decisions",count:pendingRetakes,
    message:"Resolve pending retake decisions first. Only explicitly planned retakes may carry forward.",
  });
  if(pendingResults>0)blockers.push({
    code:"pending_results",count:pendingResults,
    message:"Wait for or finalize outstanding exam results before rollover.",
  });
  if(ongoing>0)blockers.push({
    code:"ongoing_courses",count:ongoing,
    message:"Active unfinished courses still remain in this semester.",
  });
  if(incomplete>0)blockers.push({
    code:"incomplete_course_state",count:incomplete,
    message:"At least one inactive course has no terminal official outcome.",
  });

  const carryCourses=input.courses.filter(course=>course.completionState==="retake_planned");
  const terminalCourses=input.courses.filter(course=>
    course.completionState==="passed"||course.completionState==="closed_without_pass"
  ).length;

  return {
    eligible:blockers.length===0,
    blockers,carryCourses,terminalCourses,
    archivedOnlyCourses:input.courses.length-carryCourses.length,
    staleCalendarBlocks:Math.max(0,input.futureCalendarBlocks),
  };
}

export function validateNewSemester(input:{
  stableKey:string;
  displayName:string;
  startsOn:string;
  endsOn:string|null;
  timezone:string;
}):string|null{
  if(!/^[a-z0-9_]{2,40}$/.test(input.stableKey))return "Semester key must use 2–40 lowercase letters, numbers, or underscores.";
  const name=input.displayName.trim();
  if(name.length<1||name.length>80)return "Semester name must contain 1–80 characters.";
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.startsOn)||Number.isNaN(Date.parse(input.startsOn+"T00:00:00Z")))return "A valid semester start date is required.";
  if(input.endsOn){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(input.endsOn)||Number.isNaN(Date.parse(input.endsOn+"T00:00:00Z")))return "Semester end date is invalid.";
    if(input.endsOn<input.startsOn)return "Semester end date cannot be before the start date.";
  }
  if(!input.timezone.trim()||input.timezone.length>100)return "A valid timezone is required.";
  try{new Intl.DateTimeFormat("en",{timeZone:input.timezone}).format(new Date());}
  catch{return "Timezone is not recognized.";}
  return null;
}
