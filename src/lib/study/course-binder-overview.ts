import type {WeekActionRow,WeekResource} from "./workflow";
import {featuredTeachingWeek} from "./week-focus";
import {actionLabel} from "./workflow-state";

export function sourceProcessingLabel(status:string):string {
  const labels:Record<string,string>={
    verified:"Source verified",needs_review:"Needs review",
    mapped:"Mapped · not yet verified",extracted:"Extracted · not yet verified",
    classified:"Classified · not yet verified",archived:"Archived · not yet verified",
    new:"Registered · not yet verified",
  };
  return labels[status]??"Status unavailable · not verified";
}
export function isVerifiedCourseSource(item:Pick<WeekResource,"processing_status">):boolean{
  return item.processing_status==="verified";
}
/** Read-only projection. Registration, mapping and extraction never count as approval. */
export function courseBinderOverview(weeks:readonly WeekActionRow[],resources:readonly WeekResource[]){
  const featuredId=featuredTeachingWeek(weeks);
  const activeWeek=weeks.find(w=>w.teaching_week_id===featuredId)??null;
  const weekSources=activeWeek?resources.filter(r=>r.teaching_week_id===activeWeek.teaching_week_id):[];
  const verifiedSources=weekSources.filter(isVerifiedCourseSource).length;
  return {
    activeWeek,featuredId,
    action:activeWeek?actionLabel(activeWeek.next_action):"Register a teaching week",
    completedStages:activeWeek?[
      activeWeek.lecture_retrieval_completed_at,activeWeek.exercise_attempt_completed_at,
      activeWeek.solution_reconciled_at,activeWeek.checkpoint_completed_at,
    ].filter(Boolean).length:0,
    totalWeeks:weeks.length,verifiedSources,
    pendingSources:weekSources.length-verifiedSources,
    dueSkills:activeWeek?.due_skills??0,openFindings:activeWeek?.open_findings??0,
    canOpenSolutions:!activeWeek||activeWeek.exercise_count===0||Boolean(activeWeek.exercise_attempt_completed_at),
  };
}
