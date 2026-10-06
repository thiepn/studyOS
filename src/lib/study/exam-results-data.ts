import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { getSemesterForecast } from "./forecast-data";
import { examBoundaryState } from "./exam-operations";
import { closeExamAndReallocate } from "./exam-operations-data";
import {
  reconcileExamOutcome,resultBlocksCoursePlanning,structuralResultAction,validateResultDraft,
  type ExamOutcome,type ExamResultStatus,type RetakeDecision,
} from "./exam-results";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ExamResultRow=Database["public"]["Tables"]["study_exam_results"]["Row"];
type CourseRow=Pick<
  Database["public"]["Tables"]["study_courses"]["Row"],
  "id"|"stable_key"|"display_name"|"short_name"|"course_kind"|"credits"|"exam_at"|"exam_duration_minutes"|"active"|"sort_order"
>;

export type ExamResultCourse={
  courseId:string;
  displayName:string;
  shortName:string|null;
  courseKind:string;
  credits:number|null;
  active:boolean;
  examAt:string|null;
  examDurationMinutes:number|null;
  boundary:ReturnType<typeof examBoundaryState>;
  history:ExamResultRow[];
  latest:ExamResultRow|null;
  latestOfficial:ExamResultRow|null;
  pendingRetake:boolean;
  resultReady:boolean;
  nextAttemptNo:number;
  currentReadiness:number|null;
  currentBand:string|null;
  currentConfidence:string|null;
  currentDecisionPriority:number|null;
};

export type ExamResultsData={
  semesterId:string;
  nowIso:string;
  timezone:string;
  courses:ExamResultCourse[];
  results:ExamResultRow[];
  completedCourses:ExamResultCourse[];
  pendingRetakes:ExamResultCourse[];
  plannedRetakes:ExamResultCourse[];
};

export type ExamResultInput={
  courseId:string;
  attemptNo:number;
  resultStatus:ExamResultStatus;
  outcome:ExamOutcome;
  gradeText?:string|null;
  scorePercent?:number|null;
  retakeDecision:RetakeDecision;
  nextExamAt?:string|null;
  sourceNote?:string|null;
  sourceUrl?:string|null;
};

export async function getExamResultsData():Promise<ExamResultsData>{
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const [forecast,courseResult,resultResult,semesterResult]=await Promise.all([
    getSemesterForecast(),
    db.from("study_courses")
      .select("id,stable_key,display_name,short_name,course_kind,credits,exam_at,exam_duration_minutes,active,sort_order")
      .eq("semester_id",semesterId).order("sort_order"),
    db.from("study_exam_results").select("*").eq("semester_id",semesterId)
      .order("course_id").order("attempt_no",{ascending:false}),
    db.from("study_semesters").select("timezone").eq("id",semesterId).single(),
  ]);
  const error=courseResult.error||resultResult.error||semesterResult.error;
  if(error)throw new StudyServiceError("Could not load exam outcomes",error.code||"exam_results_read_failed",error);

  const forecastMap=new Map(forecast.courses.map(course=>[course.courseId,course]));
  const results=(resultResult.data??[]) as ExamResultRow[];
  const nowIso=new Date().toISOString();
  const courseRows=(courseResult.data??[]) as CourseRow[];
  const stableKeys=[...new Set(courseRows.map(course=>course.stable_key))];

  let lineageCourses:Array<{id:string;stable_key:string}>=[];
  let lineageResults:ExamResultRow[]=[];
  if(stableKeys.length){
    const lineageCourseResult=await db.from("study_courses").select("id,stable_key").in("stable_key",stableKeys);
    if(lineageCourseResult.error)throw new StudyServiceError("Could not load retake lineage",lineageCourseResult.error.code||"exam_results_lineage_failed",lineageCourseResult.error);
    lineageCourses=(lineageCourseResult.data??[]) as Array<{id:string;stable_key:string}>;
    const lineageIds=lineageCourses.map(course=>course.id);
    if(lineageIds.length){
      const lineageResult=await db.from("study_exam_results").select("*").in("course_id",lineageIds).order("attempt_no",{ascending:false});
      if(lineageResult.error)throw new StudyServiceError("Could not load retake attempt history",lineageResult.error.code||"exam_results_lineage_failed",lineageResult.error);
      lineageResults=(lineageResult.data??[]) as ExamResultRow[];
    }
  }

  const stableKeyByCourseId=new Map(lineageCourses.map(course=>[course.id,course.stable_key]));
  const historyByStableKey=new Map<string,ExamResultRow[]>();
  for(const row of lineageResults){
    const key=stableKeyByCourseId.get(String(row.course_id));
    if(!key)continue;
    const list=historyByStableKey.get(key)??[];
    list.push(row);
    historyByStableKey.set(key,list);
  }
  for(const list of historyByStableKey.values()){
    list.sort((a,b)=>Number(b.attempt_no)-Number(a.attempt_no)||Date.parse(b.exam_at)-Date.parse(a.exam_at));
  }

  const courses:ExamResultCourse[]=courseRows.map((course)=>{
    const history=historyByStableKey.get(course.stable_key)??[];
    const latest=history[0]??null;
    const latestOfficial=history.find(row=>row.result_status==="official")??null;
    const current=forecastMap.get(String(course.id))??null;
    const boundary=examBoundaryState({
      courseId:String(course.id),displayName:String(course.display_name),shortName:course.short_name,
      examAt:course.exam_at,durationMinutes:course.exam_duration_minutes,
    },nowIso);
    const maxAttempt=history.reduce((max,row)=>Math.max(max,Number(row.attempt_no??0)),0);
    const sameConfiguredAttempt=Boolean(course.exam_at&&latest?.exam_at&&Date.parse(course.exam_at)===Date.parse(latest.exam_at));
    const provisionalUpgrade=sameConfiguredAttempt&&latest?.result_status==="provisional";
    const newAttemptReady=Boolean(course.active&&boundary.closureEligible&&(!sameConfiguredAttempt||provisionalUpgrade));
    return {
      courseId:String(course.id),displayName:String(course.display_name),shortName:course.short_name,
      courseKind:String(course.course_kind),credits:course.credits==null?null:Number(course.credits),
      active:Boolean(course.active),examAt:course.exam_at,
      examDurationMinutes:course.exam_duration_minutes==null?null:Number(course.exam_duration_minutes),
      boundary,history,latest,latestOfficial,
      pendingRetake:Boolean(latestOfficial&&resultBlocksCoursePlanning(latestOfficial)),
      resultReady:newAttemptReady||Boolean(latestOfficial?.retake_decision==="pending"),
      nextAttemptNo:Math.min(10,Math.max(1,maxAttempt+1)),
      currentReadiness:current?.readinessIndex??null,currentBand:current?.band??null,
      currentConfidence:current?.confidence??null,currentDecisionPriority:current?.decisionPriority??null,
    };
  });

  return {
    semesterId,nowIso,timezone:semesterResult.data?.timezone??"Europe/Berlin",courses,results,
    completedCourses:courses.filter(course=>course.latestOfficial?.outcome==="passed"),
    pendingRetakes:courses.filter(course=>course.latestOfficial?.retake_decision==="pending"),
    plannedRetakes:courses.filter(course=>course.latestOfficial?.retake_decision==="planned"),
  };
}

export async function recordExamResult(input:ExamResultInput){
  if(!UUID.test(input.courseId))throw new StudyServiceError("Invalid course ID","invalid_exam_result");
  const data=await getExamResultsData();
  const course=data.courses.find(row=>row.courseId===input.courseId);
  if(!course)throw new StudyServiceError("Course not found","invalid_exam_result");

  const existing=course.history.find(row=>row.course_id===input.courseId&&Number(row.attempt_no)===Number(input.attemptNo))??null;
  const examAt=existing?.exam_at??course.examAt;
  if(!examAt)throw new StudyServiceError("Configure the exam date before recording a new result","invalid_exam_result");

  const boundary=examBoundaryState({
    courseId:course.courseId,displayName:course.displayName,shortName:course.shortName,
    examAt,durationMinutes:course.examDurationMinutes,
  },data.nowIso);
  if(!boundary.closureEligible)throw new StudyServiceError(
    "Exam results can be recorded only after the configured exam duration has ended",
    "invalid_exam_result",
  );

  const nextExamAt=input.nextExamAt?String(input.nextExamAt):null;
  const score=input.scorePercent==null?null:Number(input.scorePercent);
  const validation=validateResultDraft({
    attemptNo:Number(input.attemptNo),resultStatus:String(input.resultStatus),outcome:String(input.outcome),
    scorePercent:score,retakeDecision:String(input.retakeDecision),nextExamAt,
    examAt:String(examAt),nowIso:data.nowIso,
  });
  if(validation)throw new StudyServiceError(validation,"invalid_exam_result");

  const snapshot={
    readinessIndex:existing?.readiness_index_snapshot==null?course.currentReadiness:Number(existing.readiness_index_snapshot),
    readinessBand:existing?.readiness_band_snapshot??course.currentBand,
    decisionPriority:existing?.decision_priority_snapshot==null?course.currentDecisionPriority:Number(existing.decision_priority_snapshot),
    confidence:course.currentConfidence,
  };
  const reconciliation=reconcileExamOutcome({
    resultStatus:input.resultStatus,outcome:input.outcome,snapshot,
  });

  const supabase=await createClient();
  const {data:result,error}=await (supabase.rpc as any)("study_record_exam_result",{
    p_course_id:input.courseId,
    p_attempt_no:Number(input.attemptNo),
    p_exam_at:examAt,
    p_result_status:input.resultStatus,
    p_outcome:input.outcome,
    p_grade_text:input.gradeText?.trim()||null,
    p_score_percent:score,
    p_published_at:null,
    p_source_note:input.sourceNote?.trim()||null,
    p_source_url:input.sourceUrl?.trim()||null,
    p_readiness_index_snapshot:snapshot.readinessIndex,
    p_readiness_band_snapshot:snapshot.readinessBand,
    p_decision_priority_snapshot:snapshot.decisionPriority,
    p_retake_decision:input.retakeDecision,
    p_next_exam_at:nextExamAt,
  });
  if(error)throw new StudyServiceError("Could not record exam result",error.code||"exam_result_write_failed",error);

  let cleanup:any=null;
  let cleanupWarning:string|null=null;
  if(input.resultStatus==="official"){
    try{
      cleanup=await closeExamAndReallocate(input.courseId,{
        examAt:String(examAt),durationMinutes:course.examDurationMinutes,
      });
    }catch(error){
      cleanupWarning=error instanceof Error?error.message:"Post-exam planning cleanup needs manual review.";
    }
  }

  return {
    result,
    reconciliation,
    structuralAction:structuralResultAction(input),
    cleanup,
    cleanupWarning,
  };
}
