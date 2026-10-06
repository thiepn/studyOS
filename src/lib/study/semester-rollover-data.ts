import { createClient } from "@/lib/supabase/server";
import { StudyServiceError } from "./errors";
import { getSemesterCompletionData } from "./semester-completion-data";
import { evaluateRolloverPreflight, validateNewSemester } from "./semester-rollover";
import { cancelScheduledBlock } from "./calendar-autopilot";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireUser(){
  const supabase=await createClient();
  const {data,error}=await supabase.auth.getClaims();
  if(error||!data?.claims?.sub)throw new StudyServiceError("Authentication required","not_authenticated",error);
  if(data.claims.is_anonymous===true)throw new StudyServiceError("A permanent THIEPN Account is required","permanent_account_required");
  return {supabase,userId:String(data.claims.sub)};
}

export async function getSemesterRolloverData(){
  const {supabase,userId}=await requireUser();
  const db=supabase as any;
  const semesterResult=await db.from("study_semesters")
    .select("id,stable_key,display_name,starts_on,ends_on,timezone,active,archived_at,previous_semester_id,created_at")
    .eq("user_id",userId).order("created_at",{ascending:true});
  if(semesterResult.error)throw new StudyServiceError("Could not load semester history",semesterResult.error.code||"semester_history_failed",semesterResult.error);

  const semesters=(semesterResult.data??[]) as Array<any>;
  const active=semesters.find(row=>row.active)??null;
  const archives=semesters.filter(row=>!row.active).sort((a,b)=>String(b.archived_at??b.created_at).localeCompare(String(a.archived_at??a.created_at)));

  if(!active){
    return {activeSemester:null,archives,ledger:null,preflight:null,futureBlocks:[],openCommitments:[]};
  }

  const [ledger,commitmentResult,blockResult]=await Promise.all([
    getSemesterCompletionData(String(active.id)),
    db.from("study_commitments").select("id,title,due_at,course_id,estimated_minutes,priority")
      .eq("user_id",userId).eq("semester_id",active.id).eq("status","open").order("due_at"),
    db.from("study_scheduled_blocks").select("id,title,start_at,end_at,course_id,event_url,status")
      .eq("user_id",userId).eq("semester_id",active.id).eq("status","committed")
      .gt("end_at",new Date().toISOString()).order("start_at"),
  ]);
  const error=commitmentResult.error||blockResult.error;
  if(error)throw new StudyServiceError("Could not load semester rollover blockers",error.code||"semester_rollover_read_failed",error);

  const openCommitments=commitmentResult.data??[];
  const futureBlocks=blockResult.data??[];
  const preflight=evaluateRolloverPreflight({
    active:true,
    courses:ledger.courses.map(course=>({
      courseId:course.courseId,displayName:course.displayName,shortName:course.shortName,
      completionState:course.completionState,credits:course.credits,nextExamAt:course.nextExamAt,
    })),
    openCommitments:openCommitments.length,
    futureCalendarBlocks:futureBlocks.length,
  });

  return {activeSemester:active,archives,ledger,preflight,futureBlocks,openCommitments};
}

export async function rolloverSemester(input:{
  stableKey:string;
  displayName:string;
  startsOn:string;
  endsOn:string|null;
  timezone:string;
}){
  const validation=validateNewSemester(input);
  if(validation)throw new StudyServiceError(validation,"invalid_semester_rollover");

  const before=await getSemesterRolloverData();
  if(!before.activeSemester||!before.preflight)throw new StudyServiceError("No active semester is available to roll over","invalid_semester_rollover");
  if(!before.preflight.eligible){
    throw new StudyServiceError(
      "Semester rollover is blocked: "+before.preflight.blockers.map(item=>item.message).join(" "),
      "invalid_semester_rollover",
    );
  }

  const {supabase}=await requireUser();
  const {data,error}=await (supabase.rpc as any)("study_rollover_semester",{
    p_source_semester_id:String(before.activeSemester.id),
    p_new_stable_key:input.stableKey,
    p_new_display_name:input.displayName.trim(),
    p_starts_on:input.startsOn,
    p_ends_on:input.endsOn||null,
    p_timezone:input.timezone.trim(),
  });
  if(error)throw new StudyServiceError("Could not roll over semester",error.code||"semester_rollover_failed",error);

  const calendarErrors:Array<{blockId:string;title:string;error:string}>=[];
  let cancelledCalendarBlocks=0;
  for(const block of before.futureBlocks){
    try{
      await cancelScheduledBlock(String(block.id));
      cancelledCalendarBlocks++;
    }catch(error){
      calendarErrors.push({
        blockId:String(block.id),title:String(block.title),
        error:error instanceof Error?error.message:"Calendar cancellation failed",
      });
    }
  }

  return {
    rollover:data,
    archivedSemesterId:String(before.activeSemester.id),
    carriedCourses:before.preflight.carryCourses,
    cancelledCalendarBlocks,
    calendarErrors,
  };
}

export async function cleanupArchivedSemesterCalendar(semesterId:string){
  if(!UUID.test(semesterId))throw new StudyServiceError("Invalid semester ID","invalid_semester_archive");
  const {supabase,userId}=await requireUser();
  const db=supabase as any;
  const semester=await db.from("study_semesters").select("id,active,archived_at,display_name")
    .eq("id",semesterId).eq("user_id",userId).single();
  if(semester.error||!semester.data)throw new StudyServiceError("Archived semester not found","invalid_semester_archive",semester.error);
  if(semester.data.active||!semester.data.archived_at)throw new StudyServiceError("Calendar cleanup is only available for archived semesters","invalid_semester_archive");

  const blocks=await db.from("study_scheduled_blocks").select("id,title")
    .eq("user_id",userId).eq("semester_id",semesterId).eq("status","committed")
    .gt("end_at",new Date().toISOString()).order("start_at");
  if(blocks.error)throw new StudyServiceError("Could not inspect archived calendar blocks",blocks.error.code||"semester_archive_cleanup_failed",blocks.error);

  const errors:Array<{blockId:string;title:string;error:string}>=[];
  let cancelled=0;
  for(const block of blocks.data??[]){
    try{
      await cancelScheduledBlock(String(block.id));
      cancelled++;
    }catch(error){
      errors.push({blockId:String(block.id),title:String(block.title),error:error instanceof Error?error.message:"Calendar cancellation failed"});
    }
  }
  return {semesterId,cancelled,errors};
}
