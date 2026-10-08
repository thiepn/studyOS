import type { StudyEvidenceDimension } from "@/lib/supabase/database.types";
import type { QueueItem, StudyQuestion } from "./types";

export type CheckpointSkill = {
  skill_id: string;
  course_id: string;
  skill_title: string;
  first_week_no: number | null;
  required_dimensions: StudyEvidenceDimension[] | null;
  exam_importance: number;
  prerequisite_importance: number;
  mastery_state: string;
  retention_state: string;
  retention_pressure: number;
  recent_lapse: boolean;
  evidence_floor: number;
  recall_evidence?: number | null;
  recognition_evidence?: number | null;
  execution_evidence?: number | null;
  transfer_evidence?: number | null;
  exam_evidence?: number | null;
};

function evidence(skill: CheckpointSkill, dimension: StudyEvidenceDimension) {
  return Number(skill[`${dimension}_evidence` as keyof CheckpointSkill] ?? 0);
}

function weakestRequired(skill: CheckpointSkill): StudyEvidenceDimension {
  const required = skill.required_dimensions?.length ? skill.required_dimensions : ["recognition","execution"] as StudyEvidenceDimension[];
  return required.reduce((weakest, dimension) => evidence(skill, dimension) < evidence(skill, weakest) ? dimension : weakest, required[0]);
}

function targetDimension(skill: CheckpointSkill, questions: StudyQuestion[]): StudyEvidenceDimension {
  if (["relearning","lapsed","overdue"].includes(skill.retention_state)) return weakestRequired(skill);
  for (const dimension of ["exam","transfer","execution","recognition","recall"] as StudyEvidenceDimension[]) {
    if (questions.some((q) => q.evidence_dimension === dimension)) return dimension;
  }
  return weakestRequired(skill);
}

function priority(skill: CheckpointSkill, currentWeek: number) {
  const age = Math.max(0, currentWeek - (skill.first_week_no ?? currentWeek));
  const stateBonus: Record<string, number> = { relearning: 30, lapsed: 26, overdue: 20, due: 14, maintained: 4, untested: 8 };
  return Number(skill.retention_pressure ?? 0)
    + Number(skill.exam_importance ?? 3) * 7
    + Number(skill.prerequisite_importance ?? 3) * 3
    + Math.min(age, 8) * 3
    + (skill.recent_lapse ? 18 : 0)
    + (stateBonus[skill.retention_state] ?? 0);
}

function questionRank(question: StudyQuestion, target: StudyEvidenceDimension, skill: CheckpointSkill) {
  let rank = question.evidence_dimension === target ? 0 : 20;
  const higherOrder = ["exam_problem","problem","proof_skeleton","implement","debug","derivation","short_application"];
  if (higherOrder.includes(question.question_type)) rank -= 6;
  if (question.question_type === "recall" && !["relearning","lapsed"].includes(skill.retention_state)) rank += 8;
  rank += Math.abs(Number(question.difficulty ?? 3) - 3) * 0.3;
  return rank;
}

export function buildCheckpointQueue(
  skills: CheckpointSkill[],
  questions: StudyQuestion[],
  currentWeek: number,
  budgetMinutes: number,
): QueueItem[] {
  const bySkill = new Map<string, StudyQuestion[]>();
  for (const question of questions) {
    if (!question.active) continue;
    const list = bySkill.get(question.primary_skill_id) ?? [];
    list.push(question);
    bySkill.set(question.primary_skill_id, list);
  }

  const candidates = skills.flatMap((skill) => {
    const available = bySkill.get(skill.skill_id) ?? [];
    if (!available.length) return [];
    const target = targetDimension(skill, available);
    // Prefer the best question that actually fits this session's budget.
    // A 45-minute proof must not suppress a viable 15-minute derivation.
    const fitting=available.filter(q=>Number.isFinite(Number(q.expected_minutes))
      && Math.ceil(Number(q.expected_minutes))>=1
      && Math.ceil(Number(q.expected_minutes))<=budgetMinutes);
    if(!fitting.length)return [];
    const question = [...fitting].sort((a,b) => questionRank(a,target,skill) - questionRank(b,target,skill))[0];
    return [{
      skill,
      target,
      question,
      score: priority(skill,currentWeek),
      minutes: Math.max(1,Math.ceil(Number(question.expected_minutes))),
      old: (skill.first_week_no ?? currentWeek) <= currentWeek - 2,
    }];
  });

  const old = candidates.filter((x) => x.old).sort((a,b)=>b.score-a.score);
  const rest = candidates.filter((x) => !x.old).sort((a,b)=>b.score-a.score);
  const chosen: typeof candidates = [];
  const usedQuestions = new Set<string>();
  let used = 0;
  const oldTarget = Math.ceil(budgetMinutes * 0.6);

  const add = (candidate: (typeof candidates)[number]) => {
    if (usedQuestions.has(candidate.question.id) || used + candidate.minutes > budgetMinutes) return false;
    chosen.push(candidate); usedQuestions.add(candidate.question.id); used += candidate.minutes; return true;
  };

  for (const candidate of old) {
    if (used >= oldTarget) break;
    add(candidate);
  }
  const remaining = [...old.filter((x)=>!usedQuestions.has(x.question.id)), ...rest].sort((a,b)=>b.score-a.score);
  for (const candidate of remaining) {
    add(candidate);
    if (used >= budgetMinutes) break;
  }

  return chosen.map(({skill,target,question,score}) => ({
    skillId: skill.skill_id,
    courseId: skill.course_id,
    skillTitle: skill.skill_title,
    priorityScore: Math.round(score * 1000) / 1000,
    targetDimension: target,
    question: {
      id: question.id,
      question_type: question.question_type,
      evidence_dimension: question.evidence_dimension,
      prompt: question.prompt,
      expected_minutes: question.expected_minutes,
      difficulty: question.difficulty,
      answer_key_or_rubric: question.answer_key_or_rubric,
      hint_1: question.hint_1,
      hint_2: question.hint_2,
    },
  }));
}
