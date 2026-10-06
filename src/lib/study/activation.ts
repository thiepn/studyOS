import { createClient } from "@/lib/supabase/server";
import { serverConfigurationStatus } from "@/lib/env";
import { ensureStudyWorkspace } from "./bootstrap";
import { evaluateActivation, type ActivationSnapshot } from "./activation-state";
import { StudyServiceError } from "./errors";

export type ActivationCourseStatus={
  user_id:string;semester_id:string;course_id:string;stable_key:string;display_name:string;short_name:string|null;
  course_kind:"major"|"retake"|"minor";sort_order:number;drive_folder_ready:boolean;exam_date_configured:boolean;
  timetable_event_count:number;resource_count:number;week1_resource_count:number;week1_verified_resource_count:number;
  topic_count:number;skill_count:number;question_count:number;attempt_count:number;
  baseline_status:"not_started"|"in_progress"|"completed"|"skipped";baseline_classified_count:number;baseline_skill_count:number;
};

export async function getActivationData(){
  const supabase=await createClient();const {semesterId}=await ensureStudyWorkspace(supabase);const db=supabase as any;
  const [snapshotResult,coursesResult,baselineResult,driveResult,calendarResult,semesterResult]=await Promise.all([
    db.from("study_activation_snapshot").select("*").eq("semester_id",semesterId).single(),
    db.from("study_activation_course_status").select("*").eq("semester_id",semesterId).order("sort_order"),
    db.from("study_baseline_summary").select("*").eq("semester_id",semesterId).order("course_id"),
    db.from("study_drive_connections").select("status,google_account_email,root_folder_url,semester_folder_url,inbox_folder_url,last_scan_at,last_scan_status,last_error").maybeSingle(),
    db.from("study_calendar_connections").select("status,google_account_email,last_sync_at,last_sync_status,last_error").maybeSingle(),
    db.from("study_semesters").select("display_name,starts_on,ends_on,timezone,bootstrap_certified_at").eq("id",semesterId).single(),
  ]);
  const error=snapshotResult.error||coursesResult.error||baselineResult.error||driveResult.error||calendarResult.error||semesterResult.error;
  if(error)throw new StudyServiceError("Could not load P12 activation state",error.code||"activation_read_failed",error);

  const snapshot=snapshotResult.data as ActivationSnapshot;
  const server=serverConfigurationStatus();
  const evaluation=evaluateActivation({
    secureOrigin:server.secureOrigin,hasSupabaseSecret:server.hasSupabaseSecret,
    googleDriveConfigured:server.googleDriveConfigured,googleCalendarConfigured:server.googleCalendarConfigured,
  },snapshot);
  return {
    semesterId,server,snapshot,evaluation,
    courses:(coursesResult.data??[]) as ActivationCourseStatus[],
    baselines:baselineResult.data??[],
    drive:driveResult.data??null,calendar:calendarResult.data??null,semester:semesterResult.data,
  };
}
