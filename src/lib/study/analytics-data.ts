import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { buildCourseLearningAnalytics, summarizeSemesterAnalytics, type AnalyticsAttempt, type CourseLearningAnalytics, type InterventionSession } from "./analytics";
import type { DriftAttempt, DriftWeek } from "./drift";

export type CourseSemesterAnalytics={
  courseId:string;
  displayName:string;
  shortName:string|null;
  sortOrder:number;
  analytics:CourseLearningAnalytics;
};

function dayNumber(date:string){return Math.floor(Date.parse(date+"T00:00:00Z")/86_400_000);}

export async function getSemesterLearningAnalytics(){
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;

  const [semesterResult,capacityResult,courseResult,attemptResult,sessionResult,weekResult]=await Promise.all([
    db.from("study_semesters").select("starts_on").eq("id",semesterId).single(),
    db.from("study_current_capacity").select("local_today").eq("semester_id",semesterId).maybeSingle(),
    db.from("study_courses").select("id,display_name,short_name,sort_order").eq("semester_id",semesterId).eq("active",true).eq("course_kind","major").order("sort_order"),
    db.from("study_attempts").select("course_id,session_id,result,independence,duration_seconds,completed_at").order("completed_at",{ascending:true}),
    db.from("study_sessions").select("id,course_id,session_type,planned_minutes,actual_minutes,started_at,ended_at,note").eq("session_type","relearning").not("course_id","is",null).order("started_at",{ascending:true}),
    db.from("study_week_actions").select("course_id,week_no,next_action,health_status,unresolved_errors").eq("semester_id",semesterId).order("week_no"),
  ]);
  const error=semesterResult.error||capacityResult.error||courseResult.error||attemptResult.error||sessionResult.error||weekResult.error;
  if(error)throw new StudyServiceError("Could not load semester learning analytics",error.code||"learning_analytics_failed",error);

  const startsOn=String(semesterResult.data?.starts_on??"");
  const localToday=String(capacityResult.data?.local_today??new Date().toISOString().slice(0,10));
  const currentWeek=startsOn&&localToday>=startsOn?Math.floor((dayNumber(localToday)-dayNumber(startsOn))/7)+1:0;
  const courses=(courseResult.data??[]) as Array<{id:string;display_name:string;short_name:string|null;sort_order:number}>;
  const attempts=(attemptResult.data??[]) as Array<any>;
  const sessions=(sessionResult.data??[]) as Array<any>;
  const weeks=(weekResult.data??[]) as Array<any>;

  const courseAnalytics=courses.map((course):CourseSemesterAnalytics=>{
    const analyticsAttempts:AnalyticsAttempt[]=attempts.filter((a)=>String(a.course_id)===course.id).map((a)=>({
      sessionId:a.session_id==null?null:String(a.session_id),result:a.result,independence:a.independence,
      durationSeconds:a.duration_seconds==null?null:Number(a.duration_seconds),completedAt:String(a.completed_at),
    }));
    const driftAttempts:DriftAttempt[]=attempts.filter((a)=>String(a.course_id)===course.id).map((a)=>({
      result:a.result,independence:a.independence,durationSeconds:a.duration_seconds==null?null:Number(a.duration_seconds),completedAt:String(a.completed_at),
    }));
    const driftWeeks:DriftWeek[]=weeks.filter((w)=>String(w.course_id)===course.id).map((w)=>({
      weekNo:Number(w.week_no),nextAction:w.next_action==null?null:String(w.next_action),
      healthStatus:w.health_status==null?null:String(w.health_status),unresolvedErrors:Number(w.unresolved_errors??0),
    }));
    const interventions:InterventionSession[]=sessions
      .filter((session)=>String(session.course_id)===course.id&&["Targeted drift repair intervention","P14 drift repair intervention"].some(prefix=>String(session.note??"").startsWith(prefix)))
      .map((session)=>({
        id:String(session.id),startedAt:String(session.started_at),endedAt:session.ended_at==null?null:String(session.ended_at),
        plannedMinutes:session.planned_minutes==null?null:Number(session.planned_minutes),
        actualMinutes:session.actual_minutes==null?null:Number(session.actual_minutes),
      }));
    return {
      courseId:course.id,displayName:course.display_name,shortName:course.short_name,sortOrder:Number(course.sort_order),
      analytics:buildCourseLearningAnalytics({currentWeek,semesterStartsOn:startsOn,attempts:analyticsAttempts,interventions,driftAttempts,driftWeeks}),
    };
  });

  return {currentWeek,courses:courseAnalytics,summary:summarizeSemesterAnalytics(courseAnalytics.map((course)=>course.analytics))};
}
