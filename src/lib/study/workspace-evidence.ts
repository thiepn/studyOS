import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";

// Shared input snapshots for pure learning calculations. Complete history is retained.
// React cache is request scoped; Supabase RLS still authorizes every read.
export const getLearningAttempts = cache(async () => {
 const db=await createClient();
 return db.from("study_attempts").select("course_id,session_id,question_id,skill_id,evidence_dimension,result,independence,self_confidence,duration_seconds,error_types,completed_at").order("completed_at",{ascending:true});
});
export const getInterventionSessions = cache(async () => {
 const db=await createClient();
 return db.from("study_sessions").select("id,course_id,session_type,planned_minutes,actual_minutes,started_at,ended_at,note").eq("session_type","relearning").not("course_id","is",null).order("started_at",{ascending:true});
});
export const getMajorCourseRoster = cache(async () => {
 const db=await createClient();const {semesterId}=await ensureStudyWorkspace(db);
 return db.from("study_courses").select("id,display_name,short_name,sort_order").eq("semester_id",semesterId).eq("active",true).eq("course_kind","major").order("sort_order");
});
export const getLearningWeeks = cache(async () => {
 const db=await createClient();const {semesterId}=await ensureStudyWorkspace(db);
 return db.from("study_week_actions").select("course_id,week_no,next_action,health_status,unresolved_errors").eq("semester_id",semesterId).order("week_no");
});
