import { getLearningAttempts, getMajorCourseRoster, getLearningWeeks } from "./workspace-evidence";
import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { evaluateCourseDrift, type DriftAttempt, type DriftProfile, type DriftWeek } from "./drift";

export type CourseDrift={
  courseId:string;
  displayName:string;
  shortName:string|null;
  sortOrder:number;
  hasPracticeQuestions:boolean;
  profile:DriftProfile;
};

function dayNumber(date:string){return Math.floor(Date.parse(date+"T00:00:00Z")/86_400_000);}

export async function getSemesterDrift():Promise<{currentWeek:number;courses:CourseDrift[]}>{
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;

  const [semesterResult,capacityResult,courseResult,attemptResult,weekResult,questionResult]=await Promise.all([
    db.from("study_semesters").select("starts_on").eq("id",semesterId).single(),
    db.from("study_current_capacity").select("local_today").eq("semester_id",semesterId).maybeSingle(),
    getMajorCourseRoster(),
    getLearningAttempts(),
    getLearningWeeks(),
    db.from("study_questions").select("course_id").eq("active",true),
  ]);
  const error=semesterResult.error||capacityResult.error||courseResult.error||attemptResult.error||weekResult.error||questionResult.error;
  if(error)throw new StudyServiceError("Could not load multi-week drift evidence",error.code||"drift_read_failed",error);

  const startsOn=String(semesterResult.data?.starts_on??"");
  const localToday=String(capacityResult.data?.local_today??new Date().toISOString().slice(0,10));
  const currentWeek=startsOn&&localToday>=startsOn?Math.floor((dayNumber(localToday)-dayNumber(startsOn))/7)+1:0;
  const courses=(courseResult.data??[]) as Array<{id:string;display_name:string;short_name:string|null;sort_order:number}>;
  const attempts=(attemptResult.data??[]) as Array<any>;
  const weeks=(weekResult.data??[]) as Array<any>;
  const questionCourses=new Set<string>(((questionResult.data??[]) as Array<any>).map((q)=>String(q.course_id)));

  return {
    currentWeek,
    courses:courses.map((course):CourseDrift=>{
      const courseAttempts:DriftAttempt[]=attempts.filter((a)=>String(a.course_id)===course.id).map((a)=>({
        result:a.result,independence:a.independence,
        durationSeconds:a.duration_seconds==null?null:Number(a.duration_seconds),
        completedAt:String(a.completed_at),
      }));
      const courseWeeks:DriftWeek[]=weeks.filter((w)=>String(w.course_id)===course.id).map((w)=>({
        weekNo:Number(w.week_no),nextAction:w.next_action==null?null:String(w.next_action),
        healthStatus:w.health_status==null?null:String(w.health_status),unresolvedErrors:Number(w.unresolved_errors??0),
      }));
      return {
        courseId:course.id,displayName:course.display_name,shortName:course.short_name,sortOrder:Number(course.sort_order),
        hasPracticeQuestions:questionCourses.has(course.id),
        profile:evaluateCourseDrift({currentWeek,semesterStartsOn:startsOn,attempts:courseAttempts,weeks:courseWeeks}),
      };
    }),
  };
}
