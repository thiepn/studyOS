import type {DailyPlan} from "@/lib/study/planner";
import type {CommitmentRow} from "@/lib/study/planning";

/** Pure read-only view of existing academic planning evidence. */
export type TodayOverviewData={
  plannedMinutes:number;budgetMinutes:number;freeMinutes:number;
  reviewDueMinutes:number;reviewScheduledMinutes:number;
  focusItems:number;urgentPlannedItems:number;
  dueSoonCommitments:number;overdueCommitments:number;
  focusCourses:string[];
};
export function buildTodayOverview(
  plan:DailyPlan,reviewDueMinutes:number,
  commitments:ReadonlyArray<Pick<CommitmentRow,"due_at">>,now:Date,
):TodayOverviewData {
  const nowMs=now.getTime(),cutoff=nowMs+48*60*60*1000;
  const due=commitments.map(c=>Date.parse(c.due_at)).filter(Number.isFinite);
  return {
    plannedMinutes:plan.usedMinutes,budgetMinutes:plan.budgetMinutes,freeMinutes:plan.remainingMinutes,
    reviewDueMinutes:Math.max(0,reviewDueMinutes),
    reviewScheduledMinutes:plan.selected.filter(i=>i.kind==="review").reduce((n,i)=>n+i.scheduledMinutes,0),
    focusItems:plan.selected.filter(i=>i.kind!=="review").length,
    urgentPlannedItems:plan.selected.filter(i=>i.urgent).length,
    dueSoonCommitments:due.filter(t=>t>=nowMs&&t<=cutoff).length,
    overdueCommitments:due.filter(t=>t<nowMs).length,
    focusCourses:[...new Set(plan.selected.filter(i=>i.kind!=="review")
      .map(i=>i.courseName?.trim()).filter((s):s is string=>Boolean(s)))],
  };
}
