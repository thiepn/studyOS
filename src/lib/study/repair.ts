import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { chooseRepairQuestions } from "./repair-policy";
import { queueMinutes } from "./queue";
import type { QueueItem, StudyQuestion } from "./types";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getTargetedRepair(courseId: string | undefined, skillId: string | undefined, findingId?: string) {
  if(!courseId||!skillId||!UUID.test(courseId)||!UUID.test(skillId)||(findingId&&!UUID.test(findingId))) {
    throw new StudyServiceError("A valid course, skill and finding are required", "invalid_repair");
  }
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const [courseResult,skillResult,findingResult]=await Promise.all([
    db.from("study_courses").select("id,display_name").eq("id",courseId).eq("semester_id",semesterId).eq("active",true).maybeSingle(),
    db.from("study_skills").select("id,title").eq("id",skillId).eq("course_id",courseId).eq("active",true).maybeSingle(),
    findingId ? db.from("study_reconciliation_findings").select("id,title,detail,skill_id,status,exercise_resource_id,solution_resource_id")
      .eq("id",findingId).eq("course_id",courseId).maybeSingle() : Promise.resolve({data:null,error:null}),
  ]);
  const error=courseResult.error||skillResult.error||findingResult.error;
  if(error)throw new StudyServiceError("Could not prepare targeted repair",error.code||"repair_failed",error);
  if(!courseResult.data||!skillResult.data||(findingId&&(!findingResult.data||findingResult.data.skill_id!==skillId))) {
    throw new StudyServiceError("Target skill or finding is not available in the active course", "invalid_repair");
  }

  const questionsResult=await supabase.from("study_questions").select("*").eq("course_id",courseId).eq("primary_skill_id",skillId).eq("active",true);
  if(questionsResult.error)throw new StudyServiceError("Could not load repair questions",questionsResult.error.code||"repair_failed",questionsResult.error);
  const questions=chooseRepairQuestions((questionsResult.data??[]) as StudyQuestion[],skillId);
  const queue:QueueItem[]=questions.map((q,index)=>({
    courseId,skillId,skillTitle:skillResult.data.title,
    priorityScore:100-index,targetDimension:q.evidence_dimension,
    question:{
      id:q.id,question_type:q.question_type,evidence_dimension:q.evidence_dimension,prompt:q.prompt,
      expected_minutes:q.expected_minutes,difficulty:q.difficulty,
      answer_key_or_rubric:q.answer_key_or_rubric,hint_1:q.hint_1,hint_2:q.hint_2,
    },
  }));
  const sourceIds=[findingResult.data?.exercise_resource_id,findingResult.data?.solution_resource_id].filter(Boolean) as string[];
  let sourceLinks:Array<{id:string;title:string;resource_type:string;drive_url:string|null}>=[];
  if(sourceIds.length){
    const sources=await db.from("study_resources").select("id,title,resource_type,drive_url")
      .eq("course_id",courseId).eq("active",true).in("id",sourceIds);
    if(sources.error)throw new StudyServiceError("Could not load finding sources",sources.error.code||"repair_failed",sources.error);
    sourceLinks=sources.data??[];
  }
  return {
    course:courseResult.data as {id:string;display_name:string},
    skill:skillResult.data as {id:string;title:string},
    finding:findingResult.data as {id:string;title:string;detail:string|null;status:string}|null,
    sourceLinks,queue,queueMinutes:queueMinutes(queue),
  };
}
