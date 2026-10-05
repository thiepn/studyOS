import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { buildCalibrationProfile, buildCalibrationQueue, type CalibrationAttempt, type CalibrationProfile } from "./calibration";
import { queueMinutes } from "./queue";
import type { StudyQuestion } from "./types";

export type CourseCalibration = {
  courseId:string;
  displayName:string;
  shortName:string|null;
  sortOrder:number;
  profile:CalibrationProfile;
};

type CalibrationState = {
  courses:Array<{id:string;display_name:string;short_name:string|null;sort_order:number}>;
  attempts:CalibrationAttempt[];
  questions:StudyQuestion[];
  skillTitles:Map<string,string>;
};

async function loadCalibrationState():Promise<CalibrationState>{
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const courseResult=await db.from("study_courses").select("id,display_name,short_name,sort_order")
    .eq("semester_id",semesterId).eq("active",true).eq("course_kind","major").order("sort_order");
  if(courseResult.error)throw new StudyServiceError("Could not load calibration courses",courseResult.error.code||"calibration_read_failed",courseResult.error);
  const courses=(courseResult.data??[]) as CalibrationState["courses"];
  const courseIds=courses.map((c)=>c.id);
  if(!courseIds.length)return {courses,attempts:[],questions:[],skillTitles:new Map()};

  const [attemptResult,questionResult,skillResult]=await Promise.all([
    db.from("study_attempts").select("course_id,skill_id,question_id,evidence_dimension,result,independence,self_confidence,duration_seconds,error_types,completed_at")
      .in("course_id",courseIds).order("completed_at",{ascending:true}),
    db.from("study_questions").select("*").in("course_id",courseIds).eq("active",true),
    db.from("study_skills").select("id,title,course_id").in("course_id",courseIds).eq("active",true),
  ]);
  const error=attemptResult.error||questionResult.error||skillResult.error;
  if(error)throw new StudyServiceError("Could not load calibration evidence",error.code||"calibration_read_failed",error);

  const questions=(questionResult.data??[]) as StudyQuestion[];
  const expectedByQuestion=new Map(questions.map((q)=>[q.id,Number(q.expected_minutes)]));
  const attempts=((attemptResult.data??[]) as Array<any>).map((a):CalibrationAttempt=>({
    courseId:String(a.course_id),skillId:String(a.skill_id),questionId:String(a.question_id),
    evidenceDimension:a.evidence_dimension,result:a.result,independence:a.independence,
    selfConfidence:a.self_confidence==null?null:Number(a.self_confidence),
    durationSeconds:a.duration_seconds==null?null:Number(a.duration_seconds),
    expectedMinutes:expectedByQuestion.get(String(a.question_id))??null,
    errorTypes:Array.isArray(a.error_types)?a.error_types:[],
    completedAt:String(a.completed_at),
  }));
  const skillTitles=new Map<string,string>(((skillResult.data??[]) as Array<any>).map((s)=>[String(s.id),String(s.title)]));
  return {courses,attempts,questions,skillTitles};
}

export async function getSemesterCalibration(){
  const state=await loadCalibrationState();
  return state.courses.map((course):CourseCalibration=>({
    courseId:course.id,displayName:course.display_name,shortName:course.short_name,sortOrder:Number(course.sort_order),
    profile:buildCalibrationProfile(state.attempts.filter((a)=>a.courseId===course.id)),
  }));
}

export async function getCalibrationPractice(requestedCourseId?:string|null){
  const state=await loadCalibrationState();
  const summaries=state.courses.map((course):CourseCalibration=>({
    courseId:course.id,displayName:course.display_name,shortName:course.short_name,sortOrder:Number(course.sort_order),
    profile:buildCalibrationProfile(state.attempts.filter((a)=>a.courseId===course.id)),
  }));
  const selected=summaries.find((c)=>c.courseId===requestedCourseId)
    ??summaries.find((c)=>c.profile.needsCalibration)
    ??summaries[0]??null;
  if(!selected)return {course:null,profile:null,queue:[],queueMinutes:0};
  const attempts=state.attempts.filter((a)=>a.courseId===selected.courseId);
  const questions=state.questions.filter((q)=>q.course_id===selected.courseId);
  const courseSkillTitles=new Map([...state.skillTitles].filter(([skillId])=>questions.some((q)=>q.primary_skill_id===skillId)));
  const queue=buildCalibrationQueue(questions,courseSkillTitles,attempts,20,5);
  return {course:selected,profile:selected.profile,queue,queueMinutes:queueMinutes(queue)};
}
