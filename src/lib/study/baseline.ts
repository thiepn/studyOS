import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type BaselineClassification="retained"|"rusty"|"weak"|"never_mastered";

const CLASSIFICATIONS=new Set<BaselineClassification>(["retained","rusty","weak","never_mastered"]);

export type BaselineSkill={
  id:string;title:string;description:string|null;skill_kind:string;
  question:null|{id:string;prompt:string;answer_key_or_rubric:string|null;question_type:string;origin:string};
  result:null|{classification:BaselineClassification;confidence:number|null;note:string|null;classified_at:string};
};

export async function getBaselineDiagnostic(courseId:string){
  if(!UUID.test(courseId))throw new StudyServiceError("Invalid course ID","invalid_course");
  const supabase=await createClient();const {semesterId}=await ensureStudyWorkspace(supabase);const db=supabase as any;
  const [courseResult,skillsResult,questionsResult,diagResult,resultsResult,summaryResult]=await Promise.all([
    db.from("study_courses").select("id,stable_key,display_name,short_name,course_kind").eq("id",courseId).eq("semester_id",semesterId).single(),
    db.from("study_skills").select("id,title,description,skill_kind,created_at").eq("course_id",courseId).eq("active",true).order("created_at"),
    db.from("study_questions").select("id,primary_skill_id,prompt,answer_key_or_rubric,question_type,origin,created_at").eq("course_id",courseId).eq("active",true).order("created_at"),
    db.from("study_baseline_diagnostics").select("*").eq("course_id",courseId).maybeSingle(),
    db.from("study_baseline_results").select("skill_id,classification,confidence,note,classified_at").eq("course_id",courseId),
    db.from("study_baseline_summary").select("*").eq("course_id",courseId).maybeSingle(),
  ]);
  const error=courseResult.error||skillsResult.error||questionsResult.error||diagResult.error||resultsResult.error||summaryResult.error;
  if(error)throw new StudyServiceError("Could not load baseline diagnostic",error.code||"baseline_read_failed",error);
  if(courseResult.data.course_kind!=="retake")throw new StudyServiceError("Baseline diagnostics are only for retake courses","invalid_course");

  const priority=(origin:string)=>origin==="official"?3:origin==="manual"?2:1;
  const questionBySkill=new Map<string,any>();
  for(const q of questionsResult.data??[]){
    const current=questionBySkill.get(q.primary_skill_id);
    if(!current||priority(q.origin)>priority(current.origin))questionBySkill.set(q.primary_skill_id,q);
  }
  const resultBySkill=new Map((resultsResult.data??[]).map((result:any)=>[result.skill_id,result]));
  const skills:BaselineSkill[]=(skillsResult.data??[]).map((skill:any)=>({
    id:skill.id,title:skill.title,description:skill.description,skill_kind:skill.skill_kind,
    question:questionBySkill.get(skill.id)??null,result:resultBySkill.get(skill.id)??null,
  }));
  return {course:courseResult.data,diagnostic:diagResult.data??null,summary:summaryResult.data??null,skills};
}

export async function startBaseline(courseId:string){
  if(!UUID.test(courseId))throw new StudyServiceError("Invalid course ID","invalid_course");
  const supabase=await createClient();await ensureStudyWorkspace(supabase);
  const {data,error}=await (supabase.rpc as any)("study_start_baseline",{p_course_id:courseId});
  if(error)throw new StudyServiceError("Could not start baseline diagnostic",error.code||"baseline_start_failed",error);
  return data;
}

export async function classifyBaselineSkill(input:{courseId:string;skillId:string;classification:string;confidence?:number|null;note?:string|null}){
  if(!UUID.test(input.courseId)||!UUID.test(input.skillId))throw new StudyServiceError("Invalid baseline target","invalid_baseline");
  if(!CLASSIFICATIONS.has(input.classification as BaselineClassification))throw new StudyServiceError("Invalid baseline classification","invalid_baseline");
  const confidence=input.confidence==null?null:Number(input.confidence);
  if(confidence!=null&&(!Number.isInteger(confidence)||confidence<1||confidence>5))throw new StudyServiceError("Confidence must be 1–5","invalid_baseline");
  const supabase=await createClient();await ensureStudyWorkspace(supabase);
  const {data,error}=await (supabase.rpc as any)("study_classify_baseline_skill",{
    p_course_id:input.courseId,p_skill_id:input.skillId,p_classification:input.classification,
    p_confidence:confidence,p_note:input.note??null,
  });
  if(error)throw new StudyServiceError("Could not save baseline classification",error.code||"baseline_classify_failed",error);
  return data;
}

export async function completeBaseline(courseId:string){
  if(!UUID.test(courseId))throw new StudyServiceError("Invalid course ID","invalid_course");
  const supabase=await createClient();await ensureStudyWorkspace(supabase);
  const {data,error}=await (supabase.rpc as any)("study_complete_baseline",{p_course_id:courseId});
  if(error)throw new StudyServiceError("Could not complete baseline diagnostic",error.code||"baseline_complete_failed",error);
  return data;
}
