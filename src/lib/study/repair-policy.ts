import type { StudyQuestion } from "./types";

export type RepairEvidence = {
  completed_at: string;
  result: string;
  independence: string;
  skill_id: string;
};

export function isIndependentRepairEvidence(
  attempt: RepairEvidence,
  skillId: string,
  createdAt: string,
): boolean {
  const completed=Date.parse(attempt.completed_at);
  const created=Date.parse(createdAt);
  return Number.isFinite(completed) && Number.isFinite(created) && completed>created
    && attempt.result==="correct" && attempt.independence==="independent"
    && attempt.skill_id===skillId;
}

/** Prefer executable and transfer work, then an independently checkable rubric.
 * A targeted repair should never silently sample an unrelated due skill. */
export function chooseRepairQuestions<T extends Pick<StudyQuestion,"id"|"primary_skill_id"|"active"|"evidence_dimension"|"question_type"|"answer_key_or_rubric"|"expected_minutes">>(
  questions: readonly T[], skillId: string, maxQuestions=2,
): T[] {
  const priority:Record<string,number>={exam:0,transfer:1,execution:2,recognition:3,recall:4};
  return questions.filter(q=>q.active && q.primary_skill_id===skillId)
    .sort((a,b)=>
      (priority[a.evidence_dimension]??5)-(priority[b.evidence_dimension]??5)
      || Number(!a.answer_key_or_rubric?.trim())-Number(!b.answer_key_or_rubric?.trim())
      || a.expected_minutes-b.expected_minutes
      || a.id.localeCompare(b.id))
    .slice(0,maxQuestions);
}

export function validFindingSource(
  resource:{id:string;teaching_week_id:string|null;resource_type:string}|undefined,
  targetId:string|null,
  weekId:string,
  type:"exercise"|"solution",
):boolean {
  if(!targetId)return true;
  return Boolean(resource && resource.id===targetId && resource.teaching_week_id===weekId
    && (type==="solution" ? ["solution","exam_solution"].includes(resource.resource_type) : resource.resource_type==="exercise"));
}
