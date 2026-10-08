import type { StudyQuestion } from "./types";

/** Contract shared by the binder and the actual 35-minute teaching-week queue.
 * It counts only active questions that can fit the fixed practice window.
 * Source verification remains an explicit choice whenever a rubric is absent. */
export const WEEK_PRACTICE_MINUTES = 35;

export type WeekSkillAnchor = { skill_id: string; first_week_no: number | null };
export type WeekPracticeQuestion = Pick<StudyQuestion,"id"|"primary_skill_id"|"expected_minutes"|"active"|"answer_key_or_rubric">;
export type WeekPracticeAvailability = {
  availableQuestions: number;
  assessedSkills: number;
  withRubric: number;
  withoutRubric: number;
  excludedLongQuestions: number;
};

export function summarizeWeekPractice(
  anchors: readonly WeekSkillAnchor[],
  questions: readonly WeekPracticeQuestion[],
  weekMinutes=WEEK_PRACTICE_MINUTES,
): Record<number,WeekPracticeAvailability> {
  const skillsByWeek=new Map<number,Set<string>>();
  for(const skill of anchors){
    if(skill.first_week_no==null || !Number.isInteger(skill.first_week_no)
       || skill.first_week_no<1 || skill.first_week_no>40) continue;
    if(!skillsByWeek.has(skill.first_week_no)) skillsByWeek.set(skill.first_week_no,new Set());
    skillsByWeek.get(skill.first_week_no)!.add(skill.skill_id);
  }
  const result:Record<number,WeekPracticeAvailability>={};
  for(const [week,ids] of skillsByWeek){
    const eligible=questions.filter(q=>q.active && ids.has(q.primary_skill_id));
    const fitting=eligible.filter(q=>Number.isFinite(Number(q.expected_minutes))
      && Math.ceil(Number(q.expected_minutes))>=1 && Math.ceil(Number(q.expected_minutes))<=weekMinutes);
    result[week]={
      availableQuestions:fitting.length,
      assessedSkills:new Set(fitting.map(q=>q.primary_skill_id)).size,
      withRubric:fitting.filter(q=>Boolean(q.answer_key_or_rubric?.trim())).length,
      withoutRubric:fitting.filter(q=>!q.answer_key_or_rubric?.trim()).length,
      excludedLongQuestions:eligible.length-fitting.length,
    };
  }
  return result;
}

export function weekPracticeNextStep(
  availability:WeekPracticeAvailability|undefined,
  totalSkills:number,
):"learn-skill"|"prepare-questions"|"practice" {
  if(totalSkills<1) return "learn-skill";
  return (availability?.availableQuestions??0)>0 ? "practice" : "prepare-questions";
}
