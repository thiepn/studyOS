import type { DueSkill, QueueItem, StudyQuestion } from "./types";
import type { StudyEvidenceDimension } from "@/lib/supabase/database.types";

const DIMENSIONS: StudyEvidenceDimension[] = ["recall", "recognition", "execution", "transfer", "exam"];

function evidenceFor(skill: DueSkill, dimension: StudyEvidenceDimension): number {
  const value = skill[`${dimension}_evidence` as keyof DueSkill];
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function weakestRequiredDimension(skill: DueSkill): StudyEvidenceDimension {
  const required: StudyEvidenceDimension[] = skill.required_dimensions?.length ? skill.required_dimensions : ["recognition", "execution"];
  return required.reduce((weakest, dimension) => evidenceFor(skill, dimension) < evidenceFor(skill, weakest) ? dimension : weakest, required[0]);
}

function questionRank(question: StudyQuestion, target: StudyEvidenceDimension, relearning: boolean) {
  let rank = question.evidence_dimension === target ? 0 : 20;
  if (relearning && ["recall", "recognition"].includes(question.evidence_dimension)) rank -= 5;
  if (!relearning && ["transfer", "exam"].includes(target) && question.evidence_dimension === target) rank -= 4;
  rank += question.difficulty * 0.25;
  rank += Number(question.expected_minutes) * 0.02;
  return rank;
}

/** Scope before building the queue so a low-priority course cannot disappear
 * behind other courses in a fixed daily review budget. */
export function scopeDueSkills(dueSkills: DueSkill[], courseId?: string | null): DueSkill[] {
  return courseId ? dueSkills.filter(skill => skill.course_id === courseId) : dueSkills;
}

export function buildReviewQueue(dueSkills: DueSkill[], questions: StudyQuestion[], budgetMinutes: number): QueueItem[] {
  const bySkill = new Map<string, StudyQuestion[]>();
  for (const question of questions) {
    const list = bySkill.get(question.primary_skill_id) ?? [];
    list.push(question); bySkill.set(question.primary_skill_id, list);
  }
  const sorted = [...dueSkills].filter((skill) => skill.is_due && skill.skill_id && skill.course_id && skill.skill_title)
    .sort((a,b)=>Number(b.priority_score ?? 0)-Number(a.priority_score ?? 0));
  const queue: QueueItem[] = [];
  let used=0;
  for (const skill of sorted) {
    const candidates=bySkill.get(skill.skill_id!) ?? []; if(!candidates.length) continue;
    const target=weakestRequiredDimension(skill);
    const relearning=Boolean(skill.relearning_until && new Date(skill.relearning_until)>=new Date());
    const question=[...candidates].sort((a,b)=>questionRank(a,target,relearning)-questionRank(b,target,relearning))[0];
    const minutes=Math.max(1,Math.ceil(Number(question.expected_minutes)));
    if(used+minutes>budgetMinutes) continue;
    queue.push({
      skillId:skill.skill_id!,courseId:skill.course_id!,skillTitle:skill.skill_title!,
      priorityScore:Number(skill.priority_score ?? 0),targetDimension:target,
      question:{id:question.id,question_type:question.question_type,evidence_dimension:question.evidence_dimension,prompt:question.prompt,expected_minutes:question.expected_minutes,difficulty:question.difficulty,answer_key_or_rubric:question.answer_key_or_rubric,hint_1:question.hint_1,hint_2:question.hint_2},
    });
    used+=minutes; if(used>=budgetMinutes) break;
  }
  return queue;
}

export function queueMinutes(queue: QueueItem[]) {
  return queue.reduce((sum,item)=>sum+Math.max(1,Math.ceil(Number(item.question.expected_minutes))),0);
}
export { DIMENSIONS };
