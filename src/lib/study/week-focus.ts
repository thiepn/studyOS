export type WeekFocusCandidate = {
  teaching_week_id:string;
  week_no:number;
  next_action:string;
};

const ACTIONABLE=new Set([
  "process_material","retrieve_lecture","attempt_exercise",
  "reconcile_solution","repair_findings","weekly_checkpoint",
]);

/** The earliest unfinished actionable week is the next academic task.
 * Retained or unreleased weeks never displace available work. */
export function featuredTeachingWeek<T extends WeekFocusCandidate>(weeks:readonly T[]):string|null{
  const ordered=[...weeks].sort((a,b)=>a.week_no-b.week_no);
  return ordered.find(w=>ACTIONABLE.has(w.next_action))?.teaching_week_id
    ?? [...ordered].reverse().find(w=>w.next_action!=="maintain")?.teaching_week_id
    ?? ordered.at(-1)?.teaching_week_id
    ?? null;
}

/** Keep the featured week at the top; retain chronological order for the rest. */
export function orderedTeachingWeeks<T extends WeekFocusCandidate>(weeks:readonly T[]):T[]{
  const featuredId=featuredTeachingWeek(weeks);
  return [...weeks].sort((a,b)=>
    Number(b.teaching_week_id===featuredId)-Number(a.teaching_week_id===featuredId)
    || a.week_no-b.week_no
  );
}
