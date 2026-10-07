import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace, getStudyWorkspaceState } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { evaluateSemesterBootstrap, parseBootstrapCourseDraft, type BootstrapRelation } from "./semester-bootstrap";
import { validateNewSemester } from "./semester-rollover";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BootstrapCourseDetail={
  id:string;
  credits:number|null;
  professor:string|null;
  exam_at:string|null;
  exam_duration_minutes:number|null;
  exam_format:string|null;
  drive_folder_url:string|null;
};


function initialSemesterKey(displayName:string,startsOn:string){
  const normalized=displayName.normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,32);
  const fallback="semester_"+startsOn.slice(0,4);
  const base=normalized.length>=2?normalized:fallback;
  return /^[a-z0-9_]{2,40}$/.test(base)?base:fallback;
}

export async function getSemesterBootstrapEntryState(){
  const supabase=await createClient();
  return getStudyWorkspaceState(supabase);
}

export async function createInitialSemester(value:unknown){
  const row=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
  const displayName=String(row.displayName??"").trim();
  const startsOn=String(row.startsOn??"").trim();
  const endsOn=String(row.endsOn??"").trim()||null;
  const timezone=String(row.timezone??"").trim();
  const stableKey=initialSemesterKey(displayName,startsOn);
  const validation=validateNewSemester({stableKey,displayName,startsOn,endsOn,timezone});
  if(validation)throw new StudyServiceError(validation,"invalid_initial_semester");

  const supabase=await createClient();
  const state=await getStudyWorkspaceState(supabase);
  if(state.activeSemester||state.hasAnySemester)throw new StudyServiceError("Semester history already exists; use Semester Rollover instead.","invalid_initial_semester");

  const connection=await supabase.rpc("connect_thiepn_app",{p_app_slug:"semester-os"});
  if(connection.error)throw new StudyServiceError("Could not connect StudyOS to THIEPN Account",connection.error.code||"account_connection_failed",connection.error);

  const {data,error}=await (supabase.rpc as any)("study_create_initial_semester",{
    p_stable_key:stableKey,p_display_name:displayName,p_starts_on:startsOn,p_ends_on:endsOn,p_timezone:timezone,
  });
  if(error)throw new StudyServiceError("Could not create the first semester",error.code||"initial_semester_failed",error);
  return data;
}

export async function getSemesterBootstrapData(){
  const supabase=await createClient();
  const {semesterId,userId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const [semesterResult,statusResult,workflowResult,priorResult,historySemesterResult,driveResult]=await Promise.all([
    db.from("study_semesters").select("id,stable_key,display_name,starts_on,ends_on,timezone,bootstrap_certified_at,drive_semester_folder_id,drive_semester_folder_url,drive_inbox_folder_id,drive_inbox_folder_url,previous_semester_id")
      .eq("id",semesterId).single(),
    db.from("study_activation_course_status").select("*").eq("semester_id",semesterId).order("sort_order"),
    db.from("study_course_workflow_settings").select("*"),
    db.from("study_course_historical_priors").select("*").eq("semester_id",semesterId).order("created_at"),
    db.from("study_semesters").select("id,display_name,archived_at").eq("user_id",userId).eq("active",false).not("archived_at","is",null).order("archived_at",{ascending:false}),
    db.from("study_drive_connections").select("status,google_account_email,root_folder_id,root_folder_url,last_scan_at,last_scan_status,last_error").eq("user_id",userId).maybeSingle(),
  ]);
  const error=semesterResult.error||statusResult.error||workflowResult.error||priorResult.error||historySemesterResult.error||driveResult.error;
  if(error)throw new StudyServiceError("Could not load new-semester bootstrap",error.code||"semester_bootstrap_read_failed",error);

  const courseStatuses=(statusResult.data??[]) as Array<any>;
  const courseIds=courseStatuses.map(row=>String(row.course_id));
  let resources:Array<any>=[];
  if(courseIds.length){
    const resourceResult=await db.from("study_resources").select("course_id,processing_status")
      .in("course_id",courseIds).eq("active",true);
    if(resourceResult.error)throw new StudyServiceError("Could not load curriculum bootstrap state",resourceResult.error.code||"semester_bootstrap_read_failed",resourceResult.error);
    resources=resourceResult.data??[];
  }

  const workflowMap=new Map((workflowResult.data??[]).map((row:any)=>[String(row.course_id),row]));
  const priors=priorResult.data??[];
  const priorCount=new Map<string,number>();
  for(const row of priors)priorCount.set(String(row.course_id),(priorCount.get(String(row.course_id))??0)+1);
  const verifiedCount=new Map<string,number>();
  for(const row of resources){
    if(row.processing_status!=="verified")continue;
    verifiedCount.set(String(row.course_id),(verifiedCount.get(String(row.course_id))??0)+1);
  }

  const driveConnected=driveResult.data?.status==="connected";
  const driveTreeReady=Boolean(
    driveConnected&&semesterResult.data?.drive_semester_folder_id&&semesterResult.data?.drive_inbox_folder_id&&
    courseStatuses.every(row=>row.drive_folder_ready)
  );

  const courses=courseStatuses.map(row=>({
    courseId:String(row.course_id),stableKey:String(row.stable_key),displayName:String(row.display_name),
    shortName:row.short_name==null?null:String(row.short_name),courseKind:String(row.course_kind) as "major"|"minor"|"retake",
    credits:null as number|null,driveFolderReady:Boolean(row.drive_folder_ready),
    workflowReady:workflowMap.has(String(row.course_id)),verifiedResourceCount:verifiedCount.get(String(row.course_id))??0,
    skillCount:Number(row.skill_count??0),questionCount:Number(row.question_count??0),
    baselineStatus:String(row.baseline_status??"not_started"),historicalPriorCount:priorCount.get(String(row.course_id))??0,
    timetableEventCount:Number(row.timetable_event_count??0),attemptCount:Number(row.attempt_count??0),
  }));

  if(courseIds.length){
    const detailResult=await db.from("study_courses").select("id,credits,professor,exam_at,exam_duration_minutes,exam_format,drive_folder_url")
      .in("id",courseIds);
    if(detailResult.error)throw new StudyServiceError("Could not load course metadata",detailResult.error.code||"semester_bootstrap_read_failed",detailResult.error);
    const detailRows=(detailResult.data??[]) as BootstrapCourseDetail[];
    const details=new Map<string,BootstrapCourseDetail>(detailRows.map(row=>[row.id,row]));
    for(const course of courses){
      const detail=details.get(course.courseId);
      course.credits=detail?.credits==null?null:Number(detail.credits);
      Object.assign(course,{
        professor:detail?.professor??null,examAt:detail?.exam_at??null,
        examDurationMinutes:detail?.exam_duration_minutes??null,examFormat:detail?.exam_format??null,
        driveFolderUrl:detail?.drive_folder_url??null,workflow:workflowMap.get(course.courseId)??null,
      });
    }
  }

  const archivedSemesters=(historySemesterResult.data??[]) as Array<any>;
  const archivedIds=archivedSemesters.map(row=>String(row.id));
  let archivedCourses:Array<any>=[];
  if(archivedIds.length){
    const archivedCourseResult=await db.from("study_courses")
      .select("id,semester_id,stable_key,display_name,short_name,course_kind,credits")
      .in("semester_id",archivedIds).order("display_name");
    if(archivedCourseResult.error)throw new StudyServiceError("Could not load historical prior options",archivedCourseResult.error.code||"semester_bootstrap_read_failed",archivedCourseResult.error);
    archivedCourses=archivedCourseResult.data??[];
  }
  const semesterName=new Map(archivedSemesters.map(row=>[String(row.id),String(row.display_name)]));
  const priorOptions=archivedCourses.map(row=>({...row,semester_name:semesterName.get(String(row.semester_id))??"Archived semester"}));

  const evaluation=evaluateSemesterBootstrap({
    certifiedAt:semesterResult.data?.bootstrap_certified_at??null,
    driveConnected,driveTreeReady,courses,
  });

  return {
    semester:semesterResult.data,
    drive:driveResult.data??null,
    courses,
    priors,
    priorOptions,
    evaluation,
  };
}

export async function createBootstrapCourse(value:unknown){
  let input:ReturnType<typeof parseBootstrapCourseDraft>;
  try{input=parseBootstrapCourseDraft(value);}
  catch(error){throw new StudyServiceError(error instanceof Error?error.message:"Invalid course payload","invalid_semester_bootstrap_course",error);}

  const supabase=await createClient();await ensureStudyWorkspace(supabase);
  const {data,error}=await (supabase.rpc as any)("study_create_course",{
    p_stable_key:input.stableKey,p_display_name:input.displayName,p_short_name:input.shortName,
    p_course_kind:input.courseKind,p_professor:input.professor,p_credits:input.credits,p_exam_at:input.examAt,
    p_exam_duration_minutes:input.examDurationMinutes,p_exam_format:input.examFormat,p_sort_order:input.sortOrder,
    p_expected_lectures_per_week:input.expectedLecturesPerWeek,p_expects_exercise:input.expectsExercise,
    p_expects_solution:input.expectsSolution,p_lecture_retrieval_target_hours:input.lectureRetrievalTargetHours,
    p_solution_reconcile_target_hours:input.solutionReconcileTargetHours,p_checkpoint_weight:input.checkpointWeight,
  });
  if(error)throw new StudyServiceError("Could not add course",error.code||"semester_bootstrap_course_failed",error);
  return data;
}

export async function attachHistoricalPrior(input:{courseId:string;sourceCourseId:string;relation:string;note?:string|null}){
  if(!UUID.test(input.courseId)||!UUID.test(input.sourceCourseId))throw new StudyServiceError("Invalid prior course","invalid_historical_prior");
  if(!["direct_retake","prerequisite","related"].includes(input.relation))throw new StudyServiceError("Invalid prior relation","invalid_historical_prior");
  const supabase=await createClient();await ensureStudyWorkspace(supabase);
  const {data,error}=await (supabase.rpc as any)("study_attach_historical_prior",{
    p_course_id:input.courseId,p_source_course_id:input.sourceCourseId,
    p_relation:input.relation as BootstrapRelation,p_note:input.note??null,
  });
  if(error)throw new StudyServiceError("Could not attach historical prior",error.code||"historical_prior_failed",error);
  return data;
}

export async function removeHistoricalPrior(priorId:string){
  if(!UUID.test(priorId))throw new StudyServiceError("Invalid prior","invalid_historical_prior");
  const supabase=await createClient();await ensureStudyWorkspace(supabase);
  const {data,error}=await (supabase.rpc as any)("study_remove_historical_prior",{p_prior_id:priorId});
  if(error)throw new StudyServiceError("Could not remove historical prior",error.code||"historical_prior_failed",error);
  return data;
}

export async function certifySemesterBootstrap(){
  const supabase=await createClient();await ensureStudyWorkspace(supabase);
  const {data,error}=await (supabase.rpc as any)("study_certify_semester_bootstrap");
  if(error)throw new StudyServiceError("Could not certify semester bootstrap",error.code||"semester_bootstrap_certify_failed",error);
  return data;
}
