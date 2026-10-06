import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { examBoundaryState } from "./exam-operations";
import { getWeeklyCalibrationProfile } from "./weekly-calibration-data";
import {
  buildSemesterCompletionLedger,
  type SemesterCourseInput,
  type SemesterResultInput,
} from "./semester-completion";

type CourseRow=Database["public"]["Tables"]["study_courses"]["Row"];
type ResultRow=Database["public"]["Tables"]["study_exam_results"]["Row"];

export async function getSemesterCompletionData(){
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;

  const [calibrationData,semesterResult,courseResult,resultResult]=await Promise.all([
    getWeeklyCalibrationProfile(),
    db.from("study_semesters").select("id,display_name,starts_on,ends_on,timezone").eq("id",semesterId).single(),
    db.from("study_courses").select("*").eq("semester_id",semesterId).order("sort_order"),
    db.from("study_exam_results").select("*").eq("semester_id",semesterId).order("course_id").order("attempt_no"),
  ]);
  const error=semesterResult.error||courseResult.error||resultResult.error;
  if(error)throw new StudyServiceError("Could not load semester completion ledger",error.code||"semester_completion_read_failed",error);

  const nowIso=new Date().toISOString();
  const courseRows=(courseResult.data??[]) as CourseRow[];
  const resultRows=(resultResult.data??[]) as ResultRow[];

  const courses:SemesterCourseInput[]=courseRows.map(course=>{
    const boundary=examBoundaryState({
      courseId:course.id,
      displayName:course.display_name,
      shortName:course.short_name,
      examAt:course.exam_at,
      durationMinutes:course.exam_duration_minutes,
    },nowIso);
    return {
      id:course.id,
      displayName:course.display_name,
      shortName:course.short_name,
      courseKind:String(course.course_kind),
      credits:course.credits==null?null:Number(course.credits),
      active:course.active,
      examAt:course.exam_at,
      examFinished:boundary.closureEligible,
      sortOrder:Number(course.sort_order),
    };
  });

  const results:SemesterResultInput[]=resultRows.map(row=>({
    id:row.id,
    courseId:row.course_id,
    attemptNo:Number(row.attempt_no),
    examAt:row.exam_at,
    resultStatus:row.result_status,
    outcome:row.outcome,
    gradeText:row.grade_text,
    scorePercent:row.score_percent==null?null:Number(row.score_percent),
    readinessIndexSnapshot:row.readiness_index_snapshot==null?null:Number(row.readiness_index_snapshot),
    readinessBandSnapshot:row.readiness_band_snapshot,
    decisionPrioritySnapshot:row.decision_priority_snapshot==null?null:Number(row.decision_priority_snapshot),
    retakeDecision:row.retake_decision,
    nextExamAt:row.next_exam_at,
  }));

  const semester={
    displayName:String(semesterResult.data.display_name),
    startsOn:semesterResult.data.starts_on==null?null:String(semesterResult.data.starts_on),
    endsOn:semesterResult.data.ends_on==null?null:String(semesterResult.data.ends_on),
  };
  const ledger=buildSemesterCompletionLedger({
    semester,
    today:calibrationData.today,
    courses,
    results,
    calibration:calibrationData.profile,
  });

  return {
    ...ledger,
    timezone:String(semesterResult.data.timezone??calibrationData.timezone),
    nowIso,
    calibration:calibrationData.profile,
  };
}

export type SemesterCompletionData=Awaited<ReturnType<typeof getSemesterCompletionData>>;
