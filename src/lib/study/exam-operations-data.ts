import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { getDailyOrchestration } from "./planning";
import { examBoundaryState } from "./exam-operations";
import { cancelScheduledBlock } from "./calendar-autopilot";
import { applyWeeklyRebalance } from "./weekly-plan-data";
import type { ScenarioObjective } from "./scenario";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getExamOperationsData(){
  const orchestration=await getDailyOrchestration();
  const supabase=await createClient();
  const {semesterId,userId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const nowIso=new Date().toISOString();
  const blocksResult=await db.from("study_scheduled_blocks").select("*")
    .eq("user_id",userId).eq("semester_id",semesterId).eq("status","committed")
    .gt("end_at",nowIso).order("start_at");
  if(blocksResult.error)throw new StudyServiceError("Could not load exam-day scheduled blocks",blocksResult.error.code||"exam_operations_blocks_failed",blocksResult.error);
  const blocks=blocksResult.data??[];
  const progressMap=new Map((orchestration.weekRuntime?.progress.courses??[]).map(course=>[course.courseId,course]));
  const operations=orchestration.examOperations;
  const courses=operations.courses
    .filter(course=>course.examAt)
    .sort((a,b)=>Date.parse(a.examAt??"9999")-Date.parse(b.examAt??"9999"))
    .map(course=>{
      const progress=progressMap.get(course.courseId);
      const futureBlocks=blocks.filter((block:any)=>String(block.course_id)===course.courseId);
      const released=progress?progress.remainingMinutes<=0:true;
      return {
        ...course,
        weeklyTargetMinutes:progress?.targetMinutes??null,
        weeklyCreditedMinutes:progress?.completedMinutes??null,
        weeklyRemainingMinutes:progress?.remainingMinutes??0,
        futureScheduledBlocks:futureBlocks,
        closureComplete:course.closureEligible&&released&&futureBlocks.length===0,
      };
    });
  return {
    ...orchestration,
    examOperations:{...operations,courses},
    examOperationCourses:courses,
    nowIso,
  };
}

export async function closeExamAndReallocate(courseId:string,boundaryOverride?:{examAt:string;durationMinutes:number|null}){
  if(!UUID.test(courseId))throw new StudyServiceError("Invalid course ID","invalid_course");
  const supabase=await createClient();
  const {semesterId,userId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const courseResult=await db.from("study_courses")
    .select("id,display_name,short_name,exam_at,exam_duration_minutes")
    .eq("id",courseId).eq("semester_id",semesterId).eq("user_id",userId).single();
  if(courseResult.error||!courseResult.data)throw new StudyServiceError("Course exam not found",courseResult.error?.code||"invalid_course",courseResult.error);
  const boundary=examBoundaryState({
    courseId:String(courseResult.data.id),displayName:String(courseResult.data.display_name),
    shortName:courseResult.data.short_name,examAt:boundaryOverride?.examAt??courseResult.data.exam_at,
    durationMinutes:boundaryOverride?.durationMinutes??courseResult.data.exam_duration_minutes,
  },new Date().toISOString());
  if(!boundary.closureEligible)throw new StudyServiceError("Exam closure is available only after the configured exam duration has ended","invalid_exam_not_finished");

  const nowIso=new Date().toISOString();
  const blocksResult=await db.from("study_scheduled_blocks").select("id")
    .eq("user_id",userId).eq("semester_id",semesterId).eq("course_id",courseId)
    .eq("status","committed").gt("end_at",nowIso).order("start_at");
  if(blocksResult.error)throw new StudyServiceError("Could not inspect obsolete exam blocks",blocksResult.error.code||"exam_operations_blocks_failed",blocksResult.error);

  const calendarErrors:Array<{blockId:string;error:string}>=[];
  let cancelledBlocks=0;
  for(const block of blocksResult.data??[]){
    try{
      await cancelScheduledBlock(String(block.id));
      cancelledBlocks++;
    }catch(error){
      calendarErrors.push({blockId:String(block.id),error:error instanceof Error?error.message:"Calendar cancellation failed"});
    }
  }

  const orchestration=await getDailyOrchestration();
  const progress=orchestration.weekRuntime?.progress.courses.find(course=>course.courseId===courseId)??null;
  const releasedMinutes=progress?.remainingMinutes??0;
  let rebalance:{changed:boolean;reason:string}={changed:false,reason:"no_active_week_release"};
  if(orchestration.weekRuntime&&releasedMinutes>0){
    const remainingExamPressure=orchestration.examCommand.courses.some(course=>course.courseId!==courseId&&(course.daysToExam??999)<=21);
    const objective=(remainingExamPressure?"exam_period":orchestration.weekRuntime.plan.objective) as ScenarioObjective;
    rebalance=await applyWeeklyRebalance(orchestration.weekRuntime.plan.id,objective,"exam_closure:"+courseId);
  }

  return {
    courseId,examEndsAt:boundary.examEndsAt,releasedMinutes,cancelledBlocks,calendarErrors,rebalance,
  };
}
