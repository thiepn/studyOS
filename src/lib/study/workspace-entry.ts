/** Presentation only: derives destinations from verified, owner-scoped server reads.
 * Never use this function to authorize a course, semester, or account. */
export type WorkspaceEntryState={
  activeSemesterName:string|null;
  activeCourseCount:number|null;
  hasSemesterHistory:boolean;
  available:boolean;
};
export type WorkspaceEntryAction={
  status:"available"|"roster_empty"|"history_only"|"new"|"unverified";
  label:string;href:string;detail:string;
};
export function workspaceEntryAction(state:WorkspaceEntryState):WorkspaceEntryAction{
  if(!state.available)return {status:"unverified",label:"Retry account",href:"/account",detail:"Workspace status could not be verified. No active semester is assumed."};
  if(state.activeSemesterName){
    if(state.activeCourseCount===null)return {status:"unverified",label:"Review semester",href:"/semester/bootstrap",detail:"Course roster could not be verified. Avoid assuming a study plan is ready."};
    if(state.activeCourseCount===0)return {status:"roster_empty",label:"Add current courses",href:"/semester/bootstrap",detail:"The active semester has no course roster. No automatic demo data is added."};
    return {status:"available",label:"Continue studying",href:"/",detail:"Open the current authenticated academic workspace."};
  }
  if(state.hasSemesterHistory)return {status:"history_only",label:"Review semester rollover",href:"/semester/rollover",detail:"Historical semesters exist but none is active. Archived records remain read-only."};
  return {status:"new",label:"Create your first semester",href:"/semester/bootstrap",detail:"No semester has been created for this verified THIEPN Account."};
}
