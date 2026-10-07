import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import {
  buildLongitudinalProfiles,evaluatePriorTransfer,summarizeRelationReliability,
  type BaselineEvidence,type HistoricalPriorRelation,type PriorSnapshot,
} from "./cross-semester";

const EARLY_WINDOW_DAYS=21;
const dayMs=86_400_000;

function objectValue(value:unknown):Record<string,unknown>{
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

function snapshot(raw:unknown):PriorSnapshot{
  const row=objectValue(raw);
  return {
    latestOutcome:row.latest_outcome,
    latestScorePercent:row.latest_score_percent,
    latestReadinessIndex:row.latest_readiness_index,
    latestReadinessBand:row.latest_readiness_band,
    unresolvedFindings:row.unresolved_findings,
    skillCount:row.skill_count,
  };
}

export async function getCrossSemesterTransferData(){
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;

  const priorResult=await db.from("study_course_historical_priors")
    .select("id,semester_id,course_id,source_semester_id,source_course_id,relation,source_snapshot,created_at")
    .order("created_at",{ascending:true});
  if(priorResult.error)throw new StudyServiceError("Could not load historical-prior validation data",priorResult.error.code||"cross_semester_read_failed",priorResult.error);

  const priors=(priorResult.data??[]) as Array<any>;
  if(!priors.length){
    return {
      activeSemesterId:semesterId,evaluations:[],activeEvaluations:[],reliability:summarizeRelationReliability([]),
      profiles:[],activeProfiles:[],summary:{activePriors:0,usable:0,confirmed:0,partial:0,contradicted:0,insufficient:0},
    };
  }

  const targetCourseIds=[...new Set(priors.map((row)=>String(row.course_id)))];
  const allCourseIds=[...new Set(priors.flatMap((row)=>[String(row.course_id),String(row.source_course_id)]))];
  const semesterIds=[...new Set(priors.flatMap((row)=>[String(row.semester_id),String(row.source_semester_id)]))];

  const [courseResult,semesterResult,diagnosticResult,baselineResult,attemptResult]=await Promise.all([
    db.from("study_courses").select("id,semester_id,stable_key,display_name,short_name").in("id",allCourseIds),
    db.from("study_semesters").select("id,display_name,starts_on,active,archived_at").in("id",semesterIds),
    db.from("study_baseline_diagnostics").select("course_id,status,completed_at").in("course_id",targetCourseIds),
    db.from("study_baseline_results").select("course_id,classification").in("course_id",targetCourseIds),
    db.from("study_attempts").select("course_id,result,independence,completed_at").in("course_id",targetCourseIds).order("completed_at",{ascending:true}),
  ]);
  const error=courseResult.error||semesterResult.error||diagnosticResult.error||baselineResult.error||attemptResult.error;
  if(error)throw new StudyServiceError("Could not build cross-semester transfer profile",error.code||"cross_semester_read_failed",error);

  const courses=new Map<string,any>((courseResult.data??[]).map((row:any)=>[String(row.id),row]));
  const semesters=new Map<string,any>((semesterResult.data??[]).map((row:any)=>[String(row.id),row]));
  const diagnostics=new Map<string,any>((diagnosticResult.data??[]).map((row:any)=>[String(row.course_id),row]));
  const baselineRows=(baselineResult.data??[]) as Array<any>;
  const attemptRows=(attemptResult.data??[]) as Array<any>;

  const baselineFor=(courseId:string):BaselineEvidence|null=>{
    const diagnostic=diagnostics.get(courseId);
    if(!diagnostic)return null;
    const rows=baselineRows.filter((row)=>String(row.course_id)===courseId);
    const count=(classification:string)=>rows.filter((row)=>String(row.classification)===classification).length;
    return {
      status:String(diagnostic.status??"not_started"),
      retained:count("retained"),rusty:count("rusty"),weak:count("weak"),neverMastered:count("never_mastered"),
    };
  };

  const evaluations=priors.flatMap((prior)=>{
    const target=courses.get(String(prior.course_id));
    const source=courses.get(String(prior.source_course_id));
    const targetSemester=semesters.get(String(prior.semester_id));
    if(!target||!source||!targetSemester?.starts_on)return [];

    const startsAt=Date.parse(String(targetSemester.starts_on)+"T00:00:00Z");
    const endsAt=startsAt+EARLY_WINDOW_DAYS*dayMs;
    const earlyAttempts=attemptRows
      .filter((row)=>String(row.course_id)===String(prior.course_id))
      .filter((row)=>{
        const at=Date.parse(String(row.completed_at));
        return Number.isFinite(at)&&at>=startsAt&&at<endsAt;
      })
      .map((row)=>({result:row.result,independence:String(row.independence)}));

    return [evaluatePriorTransfer({
      priorId:String(prior.id),courseId:String(target.id),stableKey:String(target.stable_key),displayName:String(target.display_name),
      sourceCourseId:String(source.id),sourceDisplayName:String(source.display_name),
      relation:String(prior.relation) as HistoricalPriorRelation,snapshot:snapshot(prior.source_snapshot),
      baseline:baselineFor(String(target.id)),earlyAttempts,
    })];
  });

  const activeCourseIds=new Set(priors.filter((row)=>String(row.semester_id)===semesterId).map((row)=>String(row.course_id)));
  const activeEvaluations=evaluations.filter((row)=>activeCourseIds.has(row.courseId));
  const profiles=buildLongitudinalProfiles(evaluations);
  const activeStableKeys=new Set(activeEvaluations.filter((row)=>row.relation==="direct_retake").map((row)=>row.stableKey));
  const activeProfiles=profiles.filter((row)=>activeStableKeys.has(row.stableKey));
  const usable=activeEvaluations.filter((row)=>row.outcome!=="insufficient_evidence");

  return {
    activeSemesterId:semesterId,evaluations,activeEvaluations,reliability:summarizeRelationReliability(evaluations),profiles,activeProfiles,
    summary:{
      activePriors:activeEvaluations.length,usable:usable.length,
      confirmed:activeEvaluations.filter((row)=>row.outcome==="confirmed").length,
      partial:activeEvaluations.filter((row)=>row.outcome==="partial").length,
      contradicted:activeEvaluations.filter((row)=>row.outcome==="contradicted").length,
      insufficient:activeEvaluations.filter((row)=>row.outcome==="insufficient_evidence").length,
    },
  };
}
