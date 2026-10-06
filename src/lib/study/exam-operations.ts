export type ExamBoundaryPhase="unconfigured"|"upcoming"|"final_window"|"in_progress"|"recovery_full"|"recovery_light"|"post_exam";
export type RecoveryLevel="none"|"full"|"light";

export type ExamBoundaryInput={
  courseId:string;
  displayName:string;
  shortName:string|null;
  examAt:string|null;
  durationMinutes:number|null;
};

export type ExamBoundaryState=ExamBoundaryInput&{
  phase:ExamBoundaryPhase;
  examStartsAt:string|null;
  examEndsAt:string|null;
  closureEligible:boolean;
  recoveryLevel:RecoveryLevel;
  recoveryUntil:string|null;
  hoursFromBoundary:number|null;
};

export type ExamOperationsState={
  courses:ExamBoundaryState[];
  inProgress:ExamBoundaryState[];
  closureReady:ExamBoundaryState[];
  latestCompleted:ExamBoundaryState|null;
  recoveryLevel:RecoveryLevel;
  recoveryUntil:string|null;
};

const HOUR=3_600_000;

function validDate(value:string|null){
  if(!value)return null;
  const ms=Date.parse(value);
  return Number.isFinite(ms)?ms:null;
}

export function examBoundaryState(input:ExamBoundaryInput,nowIso:string):ExamBoundaryState{
  const now=Date.parse(nowIso);
  const start=validDate(input.examAt);
  if(start==null)return {...input,phase:"unconfigured",examStartsAt:null,examEndsAt:null,closureEligible:false,recoveryLevel:"none",recoveryUntil:null,hoursFromBoundary:null};
  const duration=Math.max(30,Number(input.durationMinutes??120));
  const end=start+duration*60_000;
  const fullUntil=end+4*HOUR;
  const lightUntil=end+12*HOUR;
  let phase:ExamBoundaryPhase;
  let recoveryLevel:RecoveryLevel="none";
  if(now<start-24*HOUR)phase="upcoming";
  else if(now<start)phase="final_window";
  else if(now<end)phase="in_progress";
  else if(now<fullUntil){phase="recovery_full";recoveryLevel="full";}
  else if(now<lightUntil){phase="recovery_light";recoveryLevel="light";}
  else phase="post_exam";
  return {
    ...input,phase,examStartsAt:new Date(start).toISOString(),examEndsAt:new Date(end).toISOString(),
    closureEligible:now>=end,recoveryLevel,
    recoveryUntil:recoveryLevel==="full"?new Date(fullUntil).toISOString():recoveryLevel==="light"?new Date(lightUntil).toISOString():null,
    hoursFromBoundary:Math.round(((now-(now<start?start:end))/HOUR)*10)/10,
  };
}

export function buildExamOperations(input:{nowIso:string;courses:ExamBoundaryInput[]}):ExamOperationsState{
  const courses=input.courses.map(course=>examBoundaryState(course,input.nowIso));
  const inProgress=courses.filter(course=>course.phase==="in_progress");
  const closureReady=courses.filter(course=>course.closureEligible&&["recovery_full","recovery_light","post_exam"].includes(course.phase));
  const completed=[...closureReady].sort((a,b)=>Date.parse(b.examEndsAt??"0")-Date.parse(a.examEndsAt??"0"));
  const latestCompleted=completed[0]??null;
  const recoveryLevel=latestCompleted?.recoveryLevel??"none";
  return {
    courses,inProgress,closureReady,latestCompleted,recoveryLevel,
    recoveryUntil:latestCompleted?.recoveryUntil??null,
  };
}

export function examRecoveryDirective(input:{
  operations:ExamOperationsState;
  courseId:string;
  heavy:boolean;
}){
  const own=input.operations.courses.find(course=>course.courseId===input.courseId);
  if(own&&["in_progress","recovery_full","recovery_light","post_exam"].includes(own.phase)){
    return {eligible:false,priorityAdjustment:0,reason:"This course's exam has started; its pre-exam preparation is frozen."};
  }
  if(input.operations.inProgress.length){
    return {eligible:false,priorityAdjustment:0,reason:"An exam is currently in progress. P23 freezes competing exam preparation until it ends."};
  }
  if(input.operations.recoveryLevel==="full"){
    return {eligible:false,priorityAdjustment:0,reason:"Immediate post-exam recovery shield is active for roughly four hours."};
  }
  if(input.operations.recoveryLevel==="light"&&input.heavy){
    return {eligible:false,priorityAdjustment:0,reason:"Post-exam light recovery is active; heavy exam work is deferred until the 12-hour recovery window ends."};
  }
  if(input.operations.recoveryLevel==="light"){
    return {eligible:true,priorityAdjustment:-6,reason:"Light post-exam recovery is active; only lighter exam work should compete today."};
  }
  return {eligible:true,priorityAdjustment:0,reason:null as string|null};
}

export function shouldFreezeCourseDiscretionary(state:ExamBoundaryState|undefined){
  return Boolean(state&&["in_progress","recovery_full","recovery_light","post_exam"].includes(state.phase));
}
