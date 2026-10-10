import type {BootstrapCourseState,SemesterBootstrapEvaluation} from "./semester-bootstrap.ts";

export type SemesterOnboardingStage="roster"|"drive"|"curriculum"|"baseline"|"certification"|"certified";
export function nextSemesterOnboardingStage(e:SemesterBootstrapEvaluation):SemesterOnboardingStage{
  if(e.certified)return "certified";
  if(e.courseCount===0)return "roster";
  if(!e.driveConnected||!e.driveTreeReady||e.courses.some(c=>!c.driveFolderReady))return "drive";
  if(e.courses.some(c=>!c.identityReady||!c.workflowReady||!c.curriculumReady))return "curriculum";
  if(e.courses.some(c=>!c.baselineReady))return "baseline";
  return e.ready?"certification":"curriculum";
}
export const SEMESTER_STAGES:{id:Exclude<SemesterOnboardingStage,"certified">;name:string;description:string}[]=[
  {id:"roster",name:"Course roster",description:"Register actual courses for the active semester"},
  {id:"drive",name:"Study Drive",description:"Connect and provision this semester's source folders"},
  {id:"curriculum",name:"Verified course material",description:"Confirm real source, skill and question evidence"},
  {id:"baseline",name:"Retake diagnostics",description:"Record a new baseline for each retake"},
  {id:"certification",name:"Final confirmation",description:"Review and explicitly certify the current workspace"},
];
export type CourseNextAction={label:string;href:string;detail:string};
export function nextCourseSetupAction(c:BootstrapCourseState):CourseNextAction{
  if(!c.identityReady||!c.workflowReady)return {label:"Review course settings",href:"/courses/"+c.courseId+"#course-settings",detail:"Verify course identity and exercise workflow"};
  if(!c.driveFolderReady)return {label:"Provision Study Drive",href:"/semester/bootstrap#bootstrap-drive",detail:"A current-semester course folder is missing"};
  if(!c.curriculumReady)return {label:"Review curriculum sources",href:"/resources?course="+encodeURIComponent(c.courseId)+"#source-library",detail:"A verified resource, skill map and question map are needed"};
  if(!c.baselineReady)return {label:"Run fresh retake baseline",href:"/diagnostics/"+c.courseId,detail:"Historical attempt evidence does not replace a current diagnostic"};
  return {label:"Open course binder",href:"/courses/"+c.courseId,detail:"All current setup checks are satisfied; formal semester confirmation is separate"};
}
export function courseSetupSummary(e:SemesterBootstrapEvaluation){
  const missing=e.courses.filter(c=>!c.ready);
  return {complete:e.readyCourses,total:e.courseCount,missing,stage:nextSemesterOnboardingStage(e),
    uncertified:e.ready&&!e.certified};
}
const YYYY_MM_DD=/^\d{4}-\d{2}-\d{2}$/;
function validDate(value:string){
  if(!YYYY_MM_DD.test(value))return false;
  const date=new Date(value+"T12:00:00Z");
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}
/** Client feedback only; the existing server semester validator is authoritative. */
export function semesterDateValidation(startsOn:string,endsOn:string):string|null{
  if(!validDate(startsOn))return "Choose a valid semester start date.";
  if(endsOn&&(!validDate(endsOn)||endsOn<startsOn))return "The end date must be valid and on or after the start date.";
  return null;
}
