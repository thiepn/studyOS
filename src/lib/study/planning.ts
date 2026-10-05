import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { getTodayData } from "./queries";
import { getSemesterPulse } from "./pulse";
import { buildDailyPlan, deadlinePressure, type PlanningCandidate, type PlanningMode } from "./planner";
import { StudyServiceError } from "./errors";
import type { ExamStrategy } from "./exams";
import { getSemesterDrift } from "./drift-data";
import { driftPriorityAdjustment } from "./drift";
import { getSemesterLearningAnalytics } from "./analytics-data";

const ACTIONS=new Set(["process_material","retrieve_lecture","attempt_exercise","reconcile_solution","repair_findings"]);
const MODE_SET=new Set<PlanningMode>(["normal","light","recovery","intensive","custom"]);
const COMMITMENT_KINDS=new Set(["assignment","deadline","exam","administrative","other"]);
const COMMITMENT_STATUSES=new Set(["open","completed","cancelled"]);

export type CurrentCapacity = {
  user_id:string; semester_id:string; timezone:string|null; local_today:string; mode:PlanningMode;
  custom_budget_minutes:number|null; daily_note:string|null; normal_budget_minutes:number; light_budget_minutes:number;
  recovery_budget_minutes:number; intensive_budget_minutes:number; light_review_budget_minutes:number;
  recovery_review_budget_minutes:number; max_focus_items:number; recovery_max_focus_items:number;
  review_daily_budget_minutes:number; total_budget_minutes:number; effective_review_budget_minutes:number; effective_max_focus_items:number;
};

export type CommitmentRow = {
  id:string;course_id:string|null;resource_id:string|null;kind:string;title:string;due_at:string;estimated_minutes:number;
  priority:number;status:string;source_url:string|null;note:string|null;completed_at:string|null;created_at:string;updated_at:string;
  calendar_id?:string|null;calendar_event_id?:string|null;calendar_synced?:boolean;source_updated_at?:string|null;
  course_name?:string|null;course_short_name?:string|null;
};

function dayNumber(date:string){
  return Math.floor(Date.parse(date+"T00:00:00Z")/86_400_000);
}
function workflowEstimate(action:string){
  return ({process_material:20,retrieve_lecture:10,attempt_exercise:60,reconcile_solution:30,repair_findings:30} as Record<string,number>)[action]??30;
}
function workflowLabel(action:string){
  return ({process_material:"Process course material",retrieve_lecture:"Reconstruct lecture",attempt_exercise:"Attempt exercise sheet",reconcile_solution:"Reconcile official solution",repair_findings:"Repair diagnosed errors"} as Record<string,string>)[action]??action.replaceAll("_"," ");
}
function examActionLabel(action:string){
  return ({process_past_exams:"Process past exams",add_exam_evidence:"Add another past exam",baseline_timed_paper:"Run baseline timed paper",timed_paper:"Run timed paper",verify_solutions:"Verify exam solutions",repair_weaknesses:"Repair exam weaknesses",mixed_exam_practice:"Mixed exam practice"} as Record<string,string>)[action]??action.replaceAll("_"," ");
}
function examEstimate(strategy:ExamStrategy){
  if(["baseline_timed_paper","timed_paper"].includes(strategy.next_action)) return Math.max(10,Number(strategy.strategy_duration_minutes??90));
  if(strategy.next_action==="repair_weaknesses"||strategy.next_action==="mixed_exam_practice") return 45;
  if(strategy.next_action==="verify_solutions") return 30;
  return 20;
}

export async function getDailyOrchestration(){
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;

  const [today,pulse,drift,learningAnalytics,capacityResult,semesterResult,settingsResult,weekResult,commitmentResult,strategyResult,papersResult,coursesResult,baselineResult]=await Promise.all([
    getTodayData(),
    getSemesterPulse(),
    getSemesterDrift(),
    getSemesterLearningAnalytics(),
    db.from("study_current_capacity").select("*").eq("semester_id",semesterId).maybeSingle(),
    db.from("study_semesters").select("starts_on,ends_on,timezone").eq("id",semesterId).single(),
    db.from("study_planning_settings").select("*").eq("semester_id",semesterId).maybeSingle(),
    db.from("study_week_actions").select("*").eq("semester_id",semesterId),
    db.from("study_commitments").select("*").eq("semester_id",semesterId).eq("status","open").order("due_at"),
    db.from("study_exam_strategy").select("*").eq("semester_id",semesterId),
    db.from("study_exam_paper_catalog").select("exam_id,course_id,exam_at,year_label,effective_weight,simulatable").eq("active",true).eq("simulatable",true).order("exam_at",{ascending:false,nullsFirst:false}),
    db.from("study_courses").select("id,display_name,short_name,sort_order").eq("semester_id",semesterId).eq("active",true).order("sort_order"),
    db.from("study_baseline_summary").select("*").eq("semester_id",semesterId),
  ]);
  const error=capacityResult.error||semesterResult.error||settingsResult.error||weekResult.error||commitmentResult.error||strategyResult.error||papersResult.error||coursesResult.error||baselineResult.error;
  if(error) throw new StudyServiceError("Could not build daily study plan",error.code||"daily_plan_failed",error);

  const capacity=(capacityResult.data??{
    semester_id:semesterId,timezone:semesterResult.data?.timezone??"Europe/Berlin",local_today:new Date().toISOString().slice(0,10),
    mode:"normal",custom_budget_minutes:null,daily_note:null,normal_budget_minutes:120,light_budget_minutes:75,recovery_budget_minutes:45,
    intensive_budget_minutes:180,light_review_budget_minutes:30,recovery_review_budget_minutes:20,max_focus_items:4,recovery_max_focus_items:2,
    review_daily_budget_minutes:40,total_budget_minutes:120,effective_review_budget_minutes:40,effective_max_focus_items:4,
  }) as CurrentCapacity;

  const courses=(coursesResult.data??[]) as Array<{id:string;display_name:string;short_name:string|null;sort_order:number}>;
  const courseMap=new Map(courses.map((course)=>[course.id,course]));
  const riskMap=new Map(pulse.risks.map((risk)=>[risk.course_id,risk]));
  const paperMap=new Map<string,string>();
  for(const paper of papersResult.data??[]) if(!paperMap.has(paper.course_id)) paperMap.set(paper.course_id,paper.exam_id);

  const candidates:PlanningCandidate[]=[];
  if(today.queueMinutes>0){
    candidates.push({
      id:"retention-review",kind:"review",courseId:null,courseName:null,title:"Retention review",
      reason:today.dueSkillCount+" due skill"+(today.dueSkillCount===1?"":"s")+" · "+today.dailyBudgetMinutes+" min review ceiling",
      href:"/practice",estimatedMinutes:today.queueMinutes,priority:92,splittable:true,allowedInRecovery:true,
    });
  }

  const startsOn=String(semesterResult.data?.starts_on??capacity.local_today);
  const currentWeek=capacity.local_today<startsOn?0:Math.floor((dayNumber(capacity.local_today)-dayNumber(startsOn))/7)+1;
  const weekRows=(weekResult.data??[]) as Array<any>;
  for(const row of weekRows){
    if(Number(row.week_no)>currentWeek||!ACTIONS.has(String(row.next_action))) continue;
    const risk=riskMap.get(row.course_id);
    const age=Math.max(0,currentWeek-Number(row.week_no));
    const base=({process_material:74,retrieve_lecture:66,attempt_exercise:72,reconcile_solution:76,repair_findings:78} as Record<string,number>)[row.next_action]??65;
    candidates.push({
      id:"workflow:"+row.teaching_week_id+":"+row.next_action,kind:"workflow",courseId:row.course_id,
      courseName:row.course_display_name,title:workflowLabel(row.next_action)+" · Week "+row.week_no,
      reason:"Course workflow"+(age? " · "+age+" week"+(age===1?"":"s")+" behind":"")+" · risk "+Math.round(Number(risk?.risk_score??0))+"/100",
      href:"/courses/"+row.course_id,estimatedMinutes:workflowEstimate(row.next_action),
      priority:base+Math.min(12,age*3)+Number(risk?.risk_score??0)*0.2,
      splittable:!["retrieve_lecture"].includes(row.next_action),allowedInRecovery:true,
    });
  }

  const commitments=(commitmentResult.data??[]) as CommitmentRow[];
  const now=new Date();
  for(const commitment of commitments){
    const pressure=deadlinePressure(commitment.due_at,now);
    const course=commitment.course_id?courseMap.get(commitment.course_id):null;
    candidates.push({
      id:"commitment:"+commitment.id,kind:"commitment",courseId:commitment.course_id,courseName:course?.display_name??null,
      title:commitment.title,reason:pressure.label+" · priority "+commitment.priority+"/5",
      href:commitment.source_url|| (commitment.course_id?"/courses/"+commitment.course_id:"/"),
      estimatedMinutes:Number(commitment.estimated_minutes),priority:52+pressure.score+Number(commitment.priority)*4,
      urgent:pressure.urgent,heavy:Number(commitment.estimated_minutes)>=90,splittable:true,allowedInRecovery:true,dueAt:commitment.due_at,
      metadata:{commitmentId:commitment.id,kind:commitment.kind},
    });
  }

  for(const baseline of baselineResult.data??[]){
    const skills=Number(baseline.skill_count??0),classified=Number(baseline.classified_count??0);
    if(skills<=0||String(baseline.status)==="completed"&&classified>=skills)continue;
    const remaining=Math.max(1,skills-classified);
    candidates.push({
      id:"baseline:"+baseline.course_id,kind:"workflow",courseId:baseline.course_id,
      courseName:baseline.display_name,title:"Retake baseline · "+(baseline.short_name??baseline.display_name),
      reason:classified+"/"+skills+" skills classified · distinguish retained, rusty, weak, and never mastered",
      href:"/diagnostics/"+baseline.course_id,estimatedMinutes:Math.min(45,Math.max(15,remaining*5)),priority:82,
      splittable:true,allowedInRecovery:true,
    });
  }

  if(pulse.checkpoint?.due){
    const daysLeft=Math.max(0,dayNumber(pulse.checkpoint.week_ends_on)-dayNumber(capacity.local_today));
    candidates.push({
      id:"checkpoint:"+pulse.checkpoint.course_id+":"+pulse.checkpoint.target_week_no,kind:"checkpoint",courseId:pulse.checkpoint.course_id,
      courseName:pulse.checkpoint.display_name,title:"Cumulative checkpoint · "+(pulse.checkpoint.short_name??pulse.checkpoint.display_name),
      reason:"Rotating Week "+pulse.checkpoint.target_week_no+" checkpoint · "+daysLeft+" day"+(daysLeft===1?"":"s")+" left this week",
      href:"/practice?mode=checkpoint",estimatedMinutes:Number(pulse.checkpoint.budget_minutes||60),priority:68+Math.max(0,12-daysLeft*2),
      heavy:true,splittable:false,allowedInRecovery:false,
    });
  }

  for(const strategy of (strategyResult.data??[]) as ExamStrategy[]){
    if(!["transition","exam"].includes(String(strategy.operating_mode))) continue;
    if(["maintain_blueprint"].includes(strategy.next_action)) continue;
    const risk=riskMap.get(strategy.course_id);
    const timed=["baseline_timed_paper","timed_paper"].includes(strategy.next_action);
    const days=Number(strategy.days_to_exam??999);
    candidates.push({
      id:"exam:"+strategy.course_id+":"+strategy.next_action,kind:"exam_strategy",courseId:strategy.course_id,
      courseName:strategy.display_name,title:examActionLabel(strategy.next_action)+" · "+(strategy.short_name??strategy.display_name),
      reason:strategy.next_action_reason,href:timed&&paperMap.get(strategy.course_id)?"/practice/exam/"+paperMap.get(strategy.course_id):"/courses/"+strategy.course_id,
      estimatedMinutes:examEstimate(strategy),priority:(strategy.operating_mode==="exam"?86:72)+Math.max(0,12-Math.max(0,days))+Number(risk?.risk_score??0)*0.15,
      urgent:days<=3,heavy:timed,splittable:!timed,allowedInRecovery:!timed,
      metadata:{action:strategy.next_action,daysToExam:strategy.days_to_exam},
    });
  }

  const driftMap=new Map(drift.courses.map((course)=>[course.courseId,course]));
  const learningMap=new Map(learningAnalytics.courses.map((course)=>[course.courseId,course.analytics]));
  for(const course of drift.courses){
    const mode=riskMap.get(course.courseId)?.operating_mode;
    if(course.profile.correctionKind!=="targeted_practice"||course.profile.correctionMinutes<=0||!course.hasPracticeQuestions)continue;
    if(mode==="transition"||mode==="exam"||mode==="post_exam")continue;
    const learning=learningMap.get(course.courseId);
    const failedPattern=learning?.difficultySignal==="persistent"||learning?.difficultySignal==="structural";
    candidates.push({
      id:"drift-repair:"+course.courseId,kind:"drift_repair",courseId:course.courseId,courseName:course.displayName,
      title:(failedPattern?"Review failed intervention pattern · ":"Targeted drift repair · ")+(course.shortName??course.displayName),
      reason:failedPattern
        ? (learning?.recommendation ?? course.profile.recommendation)
        : course.profile.recommendation,
      href:failedPattern?"/progress#course-"+course.courseId:"/practice?mode=drift&course="+course.courseId,
      estimatedMinutes:failedPattern?15:course.profile.correctionMinutes,priority:failedPattern?74:70,
      heavy:false,splittable:false,allowedInRecovery:false,
      metadata:{
        driftBand:course.profile.band,workloadFeedback:course.profile.workloadFeedback,
        difficultySignal:learning?.difficultySignal??"insufficient_evidence",
      },
    });
  }

  const correctedCandidates=candidates.map((candidate)=>{
    if(!candidate.courseId)return candidate;
    const course=driftMap.get(candidate.courseId);
    if(!course)return candidate;
    const adjustment=driftPriorityAdjustment(course.profile,candidate.kind);
    if(!adjustment)return candidate;
    return {
      ...candidate,
      priority:candidate.priority+adjustment,
      reason:candidate.reason+" · P14 "+course.profile.band+" allocation +"+adjustment,
      metadata:{...(candidate.metadata??{}),driftBand:course.profile.band,driftPriorityBoost:adjustment},
    };
  });

  const plan=buildDailyPlan(correctedCandidates,{
    mode:capacity.mode,budgetMinutes:Number(capacity.total_budget_minutes),maxFocusItems:Number(capacity.effective_max_focus_items),
  });

  const enrichedCommitments=commitments.map((commitment)=>{
    const course=commitment.course_id?courseMap.get(commitment.course_id):null;
    return {...commitment,course_name:course?.display_name??null,course_short_name:course?.short_name??null};
  });

  return {semesterId,today,pulse,drift,learningAnalytics,capacity,settings:settingsResult.data??null,courses,commitments:enrichedCommitments,candidates:correctedCandidates,plan,currentWeek};
}

export async function setDailyCapacity(input:{mode:string;customBudgetMinutes?:number|null;planDate?:string|null;note?:string|null}){
  if(!MODE_SET.has(input.mode as PlanningMode)) throw new StudyServiceError("Invalid capacity mode","invalid_capacity_mode");
  if(input.mode==="custom"&&(!Number.isInteger(input.customBudgetMinutes)||Number(input.customBudgetMinutes)<15||Number(input.customBudgetMinutes)>720)) throw new StudyServiceError("Custom budget must be 15–720 minutes","invalid_capacity_budget");
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_set_daily_capacity",{
    p_mode:input.mode,p_custom_budget_minutes:input.mode==="custom"?input.customBudgetMinutes:null,
    p_plan_date:input.planDate??null,p_note:input.note??null,
  });
  if(error) throw new StudyServiceError("Could not update today’s capacity",error.code||"capacity_update_failed",error);
  return data;
}

export async function updatePlanningSettings(input:Record<string,unknown>){
  const nums={
    normal:Number(input.normalBudgetMinutes),light:Number(input.lightBudgetMinutes),recovery:Number(input.recoveryBudgetMinutes),
    intensive:Number(input.intensiveBudgetMinutes),lightReview:Number(input.lightReviewBudgetMinutes),recoveryReview:Number(input.recoveryReviewBudgetMinutes),
    maxFocus:Number(input.maxFocusItems),recoveryMax:Number(input.recoveryMaxFocusItems),
  };
  if(Object.values(nums).some((value)=>!Number.isInteger(value))) throw new StudyServiceError("Planning settings must be whole minutes/items","invalid_planning_settings");
  const mode=String(input.defaultMode??"normal") as PlanningMode;
  if(!MODE_SET.has(mode)||mode==="custom") throw new StudyServiceError("Invalid default planning mode","invalid_planning_settings");
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_update_planning_settings",{
    p_normal_budget_minutes:nums.normal,p_light_budget_minutes:nums.light,p_recovery_budget_minutes:nums.recovery,
    p_intensive_budget_minutes:nums.intensive,p_light_review_budget_minutes:nums.lightReview,p_recovery_review_budget_minutes:nums.recoveryReview,
    p_max_focus_items:nums.maxFocus,p_recovery_max_focus_items:nums.recoveryMax,p_default_mode:mode,
  });
  if(error) throw new StudyServiceError("Could not update planning settings",error.code||"planning_settings_failed",error);
  return data;
}

export async function createCommitment(input:Record<string,unknown>){
  const title=String(input.title??"").trim(); const dueAt=String(input.dueAt??"");
  const estimated=Number(input.estimatedMinutes); const priority=Number(input.priority??3); const kind=String(input.kind??"deadline");
  if(!title||title.length>240) throw new StudyServiceError("Commitment title is required","invalid_commitment");
  if(Number.isNaN(Date.parse(dueAt))) throw new StudyServiceError("Valid due date/time is required","invalid_commitment");
  if(!Number.isInteger(estimated)||estimated<5||estimated>720) throw new StudyServiceError("Estimated time must be 5–720 minutes","invalid_commitment");
  if(!Number.isInteger(priority)||priority<1||priority>5) throw new StudyServiceError("Priority must be 1–5","invalid_commitment");
  if(!COMMITMENT_KINDS.has(kind)) throw new StudyServiceError("Invalid commitment type","invalid_commitment");
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_create_commitment",{
    p_title:title,p_due_at:dueAt,p_estimated_minutes:estimated,p_kind:kind,
    p_course_id:input.courseId?String(input.courseId):null,p_priority:priority,p_resource_id:null,
    p_source_url:input.sourceUrl?String(input.sourceUrl):null,p_note:input.note?String(input.note):null,
  });
  if(error) throw new StudyServiceError("Could not create deadline",error.code||"commitment_create_failed",error);
  return data;
}

export async function setCommitmentStatus(id:string,status:string){
  if(!COMMITMENT_STATUSES.has(status)) throw new StudyServiceError("Invalid commitment status","invalid_commitment");
  const supabase=await createClient();
  const {data,error}=await (supabase.rpc as any)("study_set_commitment_status",{p_id:id,p_status:status});
  if(error) throw new StudyServiceError("Could not update deadline",error.code||"commitment_update_failed",error);
  return data;
}
