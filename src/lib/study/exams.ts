import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import type { StudyErrorType } from "@/lib/supabase/database.types";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ExamPaper = {
  exam_id:string; course_id:string; source_resource_id:string|null; solution_resource_id:string|null;
  stable_key:string|null; title:string; exam_at:string|null; year_label:string|null; duration_minutes:number|null;
  total_points:number|null; official:boolean; active:boolean; syllabus_relevance:number; notes:string|null;
  question_count:number; mapped_question_count:number; question_points:number; official_answer_count:number;
  verified_answer_count:number; unverified_answer_count:number; missing_answer_count:number; incomplete_question_count:number;
  verified_solution_coverage_percent:number; recency_weight:number; effective_weight:number; simulatable:boolean;
};
export type ExamBlueprintRow = {
  topic_id:string; topic_key:string; topic_title:string; skill_count:number; exam_ready_skills:number; durable_percent:number;
  active_exam_count:number; observed_exam_count:number; observed_question_count:number; weighted_occurrence_percent:number;
  weighted_points_share_percent:number; avg_exam_importance:number; exam_ready_percent:number; certified_simulation_items:number;
  certified_simulation_score_percent:number|null; history_component:number; syllabus_importance_component:number;
  readiness_gap_component:number; simulation_gap_component:number; priority_score:number;
  historical_confidence:"none"|"low"|"medium"|"high"; unseen_in_past_exams:boolean;
};
export type ExamStrategy = {
  course_id:string; display_name:string; short_name:string|null; processed_exams:number; simulatable_exams:number;
  effective_exam_weight:number; exam_questions:number; verified_solution_coverage_percent:number;
  blueprint_confidence:"low"|"medium"|"high"; last_simulation_id:string|null; last_simulation_at:string|null;
  last_score_percent:number|null; last_verified_score_percent:number|null; last_verified_coverage_percent:number|null;
  last_time_used_seconds:number|null; operating_mode:string|null; days_to_exam:number|null; recommended_mix:Record<string,number>|null;
  strategy_duration_minutes:number|null; strategy_total_points:number|null; topic_priorities:Array<Record<string,unknown>>|null;
  final_check_minutes:number|null; first_pass_minutes:number|null; return_pass_minutes:number|null;
  working_minutes_per_point:number|null; next_action:string; next_action_reason:string;
};

export type SimulationQuestion = {
  exam_question_id:string; study_question_id:string|null; question_no:string; sort_order:number; max_points:number;
  prompt_text:string; source_page:number|null; source_page_end:number|null; source_section:string|null;
  answer_key_or_rubric:string|null; answer_status:"missing"|"unverified"|"verified"|"official";
  response_text:string|null; duration_seconds:number; awarded_points:number|null; error_types:StudyErrorType[];
  self_confidence:number|null; grading_status:"pending"|"provisional"|"verified"|"official"; graded_at:string|null;
};
export type ExamSimulationPage = {
  paper:ExamPaper & { source_url:string|null; solution_url:string|null; course_name:string; course_short_name:string|null };
  simulation:null|{
    id:string; status:"in_progress"|"grading"|"completed"|"abandoned"; duration_minutes:number; total_points:number;
    started_at:string; submitted_at:string|null; completed_at:string|null; awarded_points:number|null;
    verified_awarded_points:number|null; verified_max_points:number|null; score_percent:number|null;
    verified_score_percent:number|null; verified_coverage_percent:number|null; time_used_seconds:number|null;
  };
  questions:SimulationQuestion[];
};

export async function getCourseExamIntelligence(courseId:string){
  if(!UUID.test(courseId)) throw new StudyServiceError("Invalid course ID","invalid_course");
  const supabase=await createClient(); const {semesterId}=await ensureStudyWorkspace(supabase); const db=supabase as any;
  const [papers,blueprint,strategy]=await Promise.all([
    db.from("study_exam_paper_catalog").select("*").eq("course_id",courseId).order("exam_at",{ascending:false,nullsFirst:false}).order("year_label",{ascending:false,nullsFirst:false}),
    db.from("study_exam_blueprint").select("*").eq("semester_id",semesterId).eq("course_id",courseId).order("priority_score",{ascending:false}).order("topic_title"),
    db.from("study_exam_strategy").select("*").eq("course_id",courseId).maybeSingle(),
  ]);
  const error=papers.error||blueprint.error||strategy.error;
  if(error) throw new StudyServiceError("Could not load exam intelligence",error.code||"exam_intelligence_read_failed",error);
  return {papers:(papers.data??[]) as ExamPaper[],blueprint:(blueprint.data??[]) as ExamBlueprintRow[],strategy:(strategy.data??null) as ExamStrategy|null};
}

export async function getAvailableExamPapers(){
  const supabase=await createClient(); const {semesterId}=await ensureStudyWorkspace(supabase); const db=supabase as any;
  const coursesResult=await db.from("study_courses").select("id,display_name,short_name").eq("semester_id",semesterId).eq("active",true);
  if(coursesResult.error) throw new StudyServiceError("Could not load courses",coursesResult.error.code||"exam_catalog_failed",coursesResult.error);
  const courses=(coursesResult.data??[]) as Array<{id:string;display_name:string;short_name:string|null}>;
  if(!courses.length) return [];
  const courseById=new Map(courses.map((course)=>[course.id,course]));
  const {data,error}=await db.from("study_exam_paper_catalog").select("*")
    .in("course_id",courses.map((course)=>course.id)).eq("active",true).eq("simulatable",true)
    .order("exam_at",{ascending:false,nullsFirst:false}).order("year_label",{ascending:false,nullsFirst:false});
  if(error) throw new StudyServiceError("Could not load past papers",error.code||"exam_catalog_failed",error);
  return (data??[]).map((paper:ExamPaper)=>({...paper,course:courseById.get(paper.course_id)!}));
}

export async function getExamSimulationPage(examId:string):Promise<ExamSimulationPage>{
  if(!UUID.test(examId)) throw new StudyServiceError("Invalid exam ID","invalid_exam");
  const supabase=await createClient(); await ensureStudyWorkspace(supabase); const db=supabase as any;
  const paperResult=await db.from("study_exam_paper_catalog").select("*").eq("exam_id",examId).single();
  if(paperResult.error) throw new StudyServiceError("Past paper not found",paperResult.error.code||"exam_not_found",paperResult.error);
  const paper=paperResult.data as ExamPaper;
  const [courseResult,sourceResult,solutionResult,simResult]=await Promise.all([
    db.from("study_courses").select("display_name,short_name").eq("id",paper.course_id).single(),
    paper.source_resource_id?db.from("study_resources").select("drive_url").eq("id",paper.source_resource_id).maybeSingle():Promise.resolve({data:null,error:null}),
    paper.solution_resource_id?db.from("study_resources").select("drive_url").eq("id",paper.solution_resource_id).maybeSingle():Promise.resolve({data:null,error:null}),
    db.from("study_exam_simulations").select("*").eq("exam_id",examId).in("status",["in_progress","grading"]).order("started_at",{ascending:false}).limit(1).maybeSingle(),
  ]);
  const error=courseResult.error||sourceResult.error||solutionResult.error||simResult.error;
  if(error) throw new StudyServiceError("Could not load exam simulation",error.code||"exam_simulation_read_failed",error);
  let simulation=simResult.data as ExamSimulationPage["simulation"];
  if(!simulation){
    const completed=await db.from("study_exam_simulations").select("*").eq("exam_id",examId).eq("status","completed").order("completed_at",{ascending:false}).limit(1).maybeSingle();
    if(completed.error) throw new StudyServiceError("Could not load exam result",completed.error.code||"exam_simulation_read_failed",completed.error);
    simulation=completed.data as ExamSimulationPage["simulation"];
  }

  let questions:SimulationQuestion[]=[];
  if(simulation){
    const q=await db.from("study_exam_simulation_items")
      .select("exam_question_id,study_question_id,question_no,sort_order,max_points,response_text,duration_seconds,awarded_points,error_types,self_confidence,grading_status,graded_at,study_exam_questions!inner(prompt_text,source_page,source_page_end,source_section,answer_key_or_rubric,answer_status)")
      .eq("simulation_id",simulation.id).order("sort_order").order("question_no");
    if(q.error) throw new StudyServiceError("Could not load simulation questions",q.error.code||"exam_simulation_read_failed",q.error);
    questions=(q.data??[]).map((row:any)=>({
      exam_question_id:row.exam_question_id,study_question_id:row.study_question_id,question_no:row.question_no,sort_order:row.sort_order,
      max_points:Number(row.max_points),prompt_text:row.study_exam_questions.prompt_text ?? "",
      source_page:row.study_exam_questions.source_page,source_page_end:row.study_exam_questions.source_page_end,source_section:row.study_exam_questions.source_section,
      answer_key_or_rubric:simulation?.status==="in_progress"?null:row.study_exam_questions.answer_key_or_rubric,
      answer_status:simulation?.status==="in_progress"?"missing":row.study_exam_questions.answer_status,
      response_text:row.response_text,duration_seconds:row.duration_seconds,awarded_points:row.awarded_points,
      error_types:row.error_types??[],self_confidence:row.self_confidence,grading_status:row.grading_status,graded_at:row.graded_at,
    }));
  } else {
    const q=await db.from("study_exam_questions").select("id,study_question_id,question_no,sort_order,points,prompt_text,source_page,source_page_end,source_section")
      .eq("exam_id",examId).eq("active",true).order("sort_order").order("question_no");
    if(q.error) throw new StudyServiceError("Could not load past-paper questions",q.error.code||"exam_questions_failed",q.error);
    questions=(q.data??[]).map((row:any)=>({
      exam_question_id:row.id,study_question_id:row.study_question_id,question_no:row.question_no,sort_order:row.sort_order,
      max_points:Number(row.points??0),prompt_text:row.prompt_text??"",source_page:row.source_page,source_page_end:row.source_page_end,
      source_section:row.source_section,answer_key_or_rubric:null,answer_status:"missing" as const,response_text:null,duration_seconds:0,
      awarded_points:null,error_types:[],self_confidence:null,grading_status:"pending" as const,graded_at:null,
    }));
  }

  return {
    paper:{...paper,source_url:sourceResult.data?.drive_url??null,solution_url:solutionResult.data?.drive_url??null,
      course_name:courseResult.data.display_name,course_short_name:courseResult.data.short_name},
    simulation,questions
  };
}

export async function updateExamMetadata(examId:string,input:{syllabusRelevance:number;active:boolean;notes?:string|null}){
  if(!UUID.test(examId)) throw new StudyServiceError("Invalid exam ID","invalid_exam");
  if(!Number.isFinite(input.syllabusRelevance)||input.syllabusRelevance<0||input.syllabusRelevance>1) throw new StudyServiceError("Syllabus relevance must be 0–1","invalid_exam");
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_update_exam_metadata",{p_exam_id:examId,p_syllabus_relevance:input.syllabusRelevance,p_active:input.active,p_notes:input.notes??null});
  if(error) throw new StudyServiceError("Could not update past paper",error.code||"exam_update_failed",error);
  return data;
}

export async function startExamSimulation(examId:string,sessionId:string,startedAt:string){
  if(!UUID.test(examId)||!UUID.test(sessionId)||Number.isNaN(Date.parse(startedAt))) throw new StudyServiceError("Invalid simulation start","invalid_exam_simulation");
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_start_exam_simulation",{p_session_id:sessionId,p_exam_id:examId,p_started_at:startedAt});
  if(error) throw new StudyServiceError("Could not start timed paper",error.code||"exam_simulation_start_failed",error);
  return data;
}

export async function saveExamResponse(input:{simulationId:string;examQuestionId:string;responseText?:string|null;durationSeconds:number}){
  if(!UUID.test(input.simulationId)||!UUID.test(input.examQuestionId)||!Number.isInteger(input.durationSeconds)||input.durationSeconds<0||input.durationSeconds>43200) throw new StudyServiceError("Invalid simulation response","invalid_exam_simulation");
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_save_exam_simulation_response",{p_simulation_id:input.simulationId,p_exam_question_id:input.examQuestionId,p_response_text:input.responseText??null,p_duration_seconds:input.durationSeconds});
  if(error) throw new StudyServiceError("Could not save exam response",error.code||"exam_response_failed",error);
  return data;
}

export async function submitExamSimulation(input:{simulationId:string;responses:Array<{examQuestionId:string;responseText?:string|null;durationSeconds:number}>;submittedAt:string}){
  if(!UUID.test(input.simulationId)||Number.isNaN(Date.parse(input.submittedAt))) throw new StudyServiceError("Invalid simulation submission","invalid_exam_simulation");
  const responses=input.responses.map((r)=>{
    if(!UUID.test(r.examQuestionId)||!Number.isInteger(r.durationSeconds)||r.durationSeconds<0||r.durationSeconds>43200) throw new StudyServiceError("Invalid exam response","invalid_exam_simulation");
    return {exam_question_id:r.examQuestionId,response_text:r.responseText??null,duration_seconds:r.durationSeconds};
  });
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_submit_exam_simulation",{p_simulation_id:input.simulationId,p_responses:responses,p_submitted_at:input.submittedAt});
  if(error) throw new StudyServiceError("Could not submit timed paper",error.code||"exam_submit_failed",error);
  return data;
}

const ERROR_TYPES=new Set<StudyErrorType>(["concept","recall","recognition","method_selection","execution","proof_structure","calculation","misreading","time_management","programming_bug"]);
export async function gradeExamItem(input:{simulationId:string;examQuestionId:string;awardedPoints:number;errorTypes:StudyErrorType[];selfConfidence?:number|null}){
  if(!UUID.test(input.simulationId)||!UUID.test(input.examQuestionId)||!Number.isFinite(input.awardedPoints)||input.awardedPoints<0) throw new StudyServiceError("Invalid exam grade","invalid_exam_grade");
  if(input.errorTypes.some((x)=>!ERROR_TYPES.has(x))) throw new StudyServiceError("Invalid error type","invalid_exam_grade");
  if(input.selfConfidence!=null&&(!Number.isInteger(input.selfConfidence)||input.selfConfidence<1||input.selfConfidence>5)) throw new StudyServiceError("Invalid confidence","invalid_exam_grade");
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_grade_exam_simulation_item",{
    p_simulation_id:input.simulationId,p_exam_question_id:input.examQuestionId,p_awarded_points:input.awardedPoints,
    p_error_types:input.errorTypes,p_self_confidence:input.selfConfidence??null,p_graded_at:new Date().toISOString()
  });
  if(error) throw new StudyServiceError("Could not grade exam question",error.code||"exam_grade_failed",error);
  return data;
}

export async function finishExamSimulation(simulationId:string,note?:string|null){
  if(!UUID.test(simulationId)) throw new StudyServiceError("Invalid simulation","invalid_exam_simulation");
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_finish_exam_simulation",{p_simulation_id:simulationId,p_completed_at:new Date().toISOString(),p_note:note??null});
  if(error) throw new StudyServiceError("Could not finish exam simulation",error.code||"exam_finish_failed",error);
  return data;
}

export async function abandonExamSimulation(simulationId:string){
  if(!UUID.test(simulationId)) throw new StudyServiceError("Invalid simulation","invalid_exam_simulation");
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_abandon_exam_simulation",{p_simulation_id:simulationId,p_ended_at:new Date().toISOString()});
  if(error) throw new StudyServiceError("Could not abandon exam simulation",error.code||"exam_abandon_failed",error);
  return data;
}
