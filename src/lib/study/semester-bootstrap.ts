export type BootstrapCourseKind="major"|"minor"|"retake";
export type BootstrapRelation="direct_retake"|"prerequisite"|"related";

export type BootstrapCourseInput={
  courseId:string;
  stableKey:string;
  displayName:string;
  shortName:string|null;
  courseKind:BootstrapCourseKind;
  credits:number|null;
  driveFolderReady:boolean;
  workflowReady:boolean;
  verifiedResourceCount:number;
  skillCount:number;
  questionCount:number;
  baselineStatus:string;
  historicalPriorCount:number;
};

export type BootstrapCourseState=BootstrapCourseInput&{
  identityReady:boolean;
  curriculumReady:boolean;
  baselineReady:boolean;
  ready:boolean;
  blockers:string[];
};

export type SemesterBootstrapEvaluation={
  ready:boolean;
  certified:boolean;
  courseCount:number;
  readyCourses:number;
  driveConnected:boolean;
  driveTreeReady:boolean;
  blockers:string[];
  courses:BootstrapCourseState[];
  percent:number;
};

export function evaluateSemesterBootstrap(input:{
  certifiedAt:string|null;
  driveConnected:boolean;
  driveTreeReady:boolean;
  courses:BootstrapCourseInput[];
}):SemesterBootstrapEvaluation{
  const courses=input.courses.map((course):BootstrapCourseState=>{
    const blockers:string[]=[];
    const identityReady=Boolean(course.stableKey&&course.displayName);
    if(!identityReady)blockers.push("Course identity is incomplete.");
    if(!course.workflowReady)blockers.push("Workflow expectations are missing.");
    if(!course.driveFolderReady)blockers.push("Active-semester Drive folder is missing.");
    const curriculumReady=course.verifiedResourceCount>0&&course.skillCount>0&&course.questionCount>0;
    if(!curriculumReady)blockers.push("Verified curriculum source, skill map, and question map are required.");
    const baselineReady=course.courseKind!=="retake"||course.baselineStatus==="completed";
    if(!baselineReady)blockers.push("Retake baseline diagnostic is incomplete.");
    return {...course,identityReady,curriculumReady,baselineReady,ready:blockers.length===0,blockers};
  });
  const blockers:string[]=[];
  if(!courses.length)blockers.push("Add at least one real course.");
  if(!input.driveConnected)blockers.push("Connect Study Drive.");
  if(!input.driveTreeReady)blockers.push("Provision the active-semester Drive tree.");
  const incomplete=courses.filter(course=>!course.ready);
  if(incomplete.length)blockers.push(incomplete.length+" course"+(incomplete.length===1?" is":"s are")+" not bootstrap-ready.");
  const ready=blockers.length===0;
  const checks=2+Math.max(1,courses.length);
  const done=(input.driveConnected?1:0)+(input.driveTreeReady?1:0)+courses.filter(course=>course.ready).length;
  return {
    ready,certified:Boolean(input.certifiedAt),courseCount:courses.length,readyCourses:courses.length-incomplete.length,
    driveConnected:input.driveConnected,driveTreeReady:input.driveTreeReady,blockers,courses,
    percent:Math.round(done/checks*100),
  };
}

export function parseBootstrapCourseDraft(value:unknown){
  if(!value||typeof value!=="object")throw new Error("Invalid course payload");
  const input=value as Record<string,unknown>;
  const stableKey=String(input.stableKey??"").trim();
  const displayName=String(input.displayName??"").trim();
  const courseKind=String(input.courseKind??"major");
  if(!/^[a-z0-9_]{2,80}$/.test(stableKey))throw new Error("Stable key must use 2–80 lowercase letters, numbers, or underscores.");
  if(!displayName||displayName.length>160)throw new Error("Course name must contain 1–160 characters.");
  if(!["major","minor","retake"].includes(courseKind))throw new Error("Invalid course kind.");
  const num=(key:string,min:number,max:number,integer=false)=>{
    const raw=input[key];
    if(raw==null||raw==="")return null;
    const n=Number(raw);
    if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new Error("Invalid "+key);
    return n;
  };
  const examAt=input.examAt==null||input.examAt===""?null:String(input.examAt);
  if(examAt&&Number.isNaN(Date.parse(examAt)))throw new Error("Invalid exam date.");
  return {
    stableKey,displayName,
    shortName:String(input.shortName??"").trim().slice(0,40)||null,
    courseKind:courseKind as BootstrapCourseKind,
    professor:String(input.professor??"").trim().slice(0,160)||null,
    credits:num("credits",0.5,60),
    examAt,
    examDurationMinutes:num("examDurationMinutes",15,600,true),
    examFormat:String(input.examFormat??"").trim().slice(0,200)||null,
    sortOrder:num("sortOrder",0,32767,true),
    expectedLecturesPerWeek:num("expectedLecturesPerWeek",0,7,true),
    expectsExercise:input.expectsExercise!==false,
    expectsSolution:input.expectsSolution!==false,
    lectureRetrievalTargetHours:num("lectureRetrievalTargetHours",1,168,true)??24,
    solutionReconcileTargetHours:num("solutionReconcileTargetHours",1,336,true)??48,
    checkpointWeight:num("checkpointWeight",0.1,10)??1,
  };
}

export function historicalPriorUse(relation:BootstrapRelation){
  if(relation==="direct_retake")return "Use the archived attempt/evidence history to choose what to re-diagnose first. Do not restore old mastery.";
  if(relation==="prerequisite")return "Use prerequisite weaknesses only to prioritize diagnostic coverage. Current-semester evidence remains authoritative.";
  return "Use this related course as advisory context only; do not infer retained mastery.";
}


export function bootstrapAllowsCandidate(certified:boolean,kind:string){
  return certified||kind==="commitment";
}
