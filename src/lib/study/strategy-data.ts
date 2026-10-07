import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { getSemesterLearningAnalytics } from "./analytics-data";
import { getSemesterCalibration } from "./calibration-data";
import { evaluateIntervention, type AnalyticsAttempt, type InterventionSession, type InterventionEvaluation } from "./analytics";
import {
  buildStrategyQueue,isStrategyKey,recommendStrategy,strategyDefinition,STRATEGIES,
  type StrategyAttempt,type StrategyHistory,type StrategyKey,type StrategyRecommendation,type StrategySkill,
} from "./strategy";
import type { StudyQuestion } from "./types";
import { queueMinutes } from "./queue";

export type StrategyExperimentRecord={
  sessionId:string;
  strategyKey:StrategyKey;
  strategyTitle:string;
  interventionWeek:number;
  outcome:InterventionEvaluation["outcome"];
  accuracyDelta:number|null;
  baselineAccuracyPercent:number|null;
  followupAccuracyPercent:number|null;
};

export type CourseStrategyPortfolio={
  courseId:string;
  displayName:string;
  shortName:string|null;
  sortOrder:number;
  difficultySignal:string;
  eligibleForExperiment:boolean;
  recommendation:StrategyRecommendation;
  experiments:StrategyExperimentRecord[];
};

type StrategyState={
  currentWeek:number;
  startsOn:string;
  courses:Array<{id:string;display_name:string;short_name:string|null;sort_order:number}>;
  attempts:Array<any>;
  sessions:Array<any>;
  questions:StudyQuestion[];
  skills:Array<any>;
};

function dayNumber(date:string){return Math.floor(Date.parse(date+"T00:00:00Z")/86_400_000);}
function parseStrategyKey(note:string|null|undefined):StrategyKey|null{
  const match=String(note??"").match(/^(?:P16 )?strategy experiment:([a-z_]+)/);
  return match&&isStrategyKey(match[1])?match[1]:null;
}
function taggedIntervention(note:string|null|undefined){
  const value=String(note??"");
  return value.startsWith("Targeted drift repair intervention")||value.startsWith("P14 drift repair intervention")||value.startsWith("strategy experiment:")||value.startsWith("P16 strategy experiment:");
}

async function loadStrategyState():Promise<StrategyState>{
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const [semesterResult,capacityResult,courseResult,attemptResult,sessionResult,questionResult,skillResult]=await Promise.all([
    db.from("study_semesters").select("starts_on").eq("id",semesterId).single(),
    db.from("study_current_capacity").select("local_today").eq("semester_id",semesterId).maybeSingle(),
    db.from("study_courses").select("id,display_name,short_name,sort_order").eq("semester_id",semesterId).eq("active",true).eq("course_kind","major").order("sort_order"),
    db.from("study_attempts").select("course_id,session_id,question_id,skill_id,evidence_dimension,result,independence,duration_seconds,completed_at").order("completed_at",{ascending:true}),
    db.from("study_sessions").select("id,course_id,session_type,planned_minutes,actual_minutes,started_at,ended_at,note").eq("session_type","relearning").not("course_id","is",null).order("started_at",{ascending:true}),
    db.from("study_questions").select("*").eq("active",true),
    db.from("study_skills").select("id,course_id,title,prerequisite_importance").eq("active",true),
  ]);
  const error=semesterResult.error||capacityResult.error||courseResult.error||attemptResult.error||sessionResult.error||questionResult.error||skillResult.error;
  if(error)throw new StudyServiceError("Could not load strategy evidence",error.code||"strategy_read_failed",error);

  const startsOn=String(semesterResult.data?.starts_on??"");
  const localToday=String(capacityResult.data?.local_today??new Date().toISOString().slice(0,10));
  const currentWeek=startsOn&&localToday>=startsOn?Math.floor((dayNumber(localToday)-dayNumber(startsOn))/7)+1:0;
  return {
    currentWeek,startsOn,
    courses:(courseResult.data??[]) as StrategyState["courses"],
    attempts:(attemptResult.data??[]) as Array<any>,
    sessions:(sessionResult.data??[]) as Array<any>,
    questions:(questionResult.data??[]) as StudyQuestion[],
    skills:(skillResult.data??[]) as Array<any>,
  };
}

function courseHistory(state:StrategyState,courseId:string){
  const attempts:AnalyticsAttempt[]=state.attempts.filter((a)=>String(a.course_id)===courseId).map((a)=>({
    sessionId:a.session_id==null?null:String(a.session_id),result:a.result,independence:a.independence,
    durationSeconds:a.duration_seconds==null?null:Number(a.duration_seconds),completedAt:String(a.completed_at),
  }));
  const allTagged=state.sessions.filter((session)=>String(session.course_id)===courseId&&taggedIntervention(session.note)&&session.ended_at);
  const allTaggedIds=new Set(allTagged.map((session)=>String(session.id)));
  const p16=allTagged.filter((session)=>parseStrategyKey(session.note));
  const evaluations=p16.map((session)=>{
    const key=parseStrategyKey(session.note)!;
    const evaluation=evaluateIntervention({
      id:String(session.id),startedAt:String(session.started_at),endedAt:String(session.ended_at),
      plannedMinutes:session.planned_minutes==null?null:Number(session.planned_minutes),
      actualMinutes:session.actual_minutes==null?null:Number(session.actual_minutes),
    },attempts,state.currentWeek,state.startsOn,allTaggedIds);
    return {session,key,evaluation};
  });

  const histories:StrategyHistory[]=STRATEGIES.map((strategy)=>{
    const rows=evaluations.filter((row)=>row.key===strategy.key);
    const evaluated=rows.filter((row)=>["effective","unchanged","regressed"].includes(row.evaluation.outcome));
    const effective=evaluated.filter((row)=>row.evaluation.outcome==="effective").length;
    const pending=rows.filter((row)=>row.evaluation.outcome==="pending"||row.evaluation.outcome==="insufficient_evidence").length;
    const latest=rows.length?rows[rows.length-1].evaluation:null;
    const latestOutcome=latest?.outcome==="insufficient_evidence"&&state.currentWeek<=latest.interventionWeek+2
      ?"pending"
      :latest?.outcome??null;
    return {
      key:strategy.key,experiments:rows.length,evaluated:evaluated.length,effective,pending,
      effectivenessRate:evaluated.length?Math.round(effective/evaluated.length*100):null,
      latestOutcome,
    };
  });

  const experiments:StrategyExperimentRecord[]=evaluations
    .slice().reverse()
    .map((row)=>({
      sessionId:String(row.session.id),strategyKey:row.key,strategyTitle:strategyDefinition(row.key).title,
      interventionWeek:row.evaluation.interventionWeek,outcome:row.evaluation.outcome,accuracyDelta:row.evaluation.accuracyDelta,
      baselineAccuracyPercent:row.evaluation.baselineAccuracyPercent,followupAccuracyPercent:row.evaluation.followupAccuracyPercent,
    }));
  return {histories,experiments};
}

export async function getSemesterStrategyPortfolios(){
  const [state,learning,calibration]=await Promise.all([loadStrategyState(),getSemesterLearningAnalytics(),getSemesterCalibration()]);
  const learningMap=new Map(learning.courses.map((course)=>[course.courseId,course.analytics]));
  const calibrationMap=new Map(calibration.map((course)=>[course.courseId,course.profile]));

  const courses=state.courses.map((course):CourseStrategyPortfolio=>{
    const learned=learningMap.get(course.id);
    const calibrated=calibrationMap.get(course.id);
    const {histories,experiments}=courseHistory(state,course.id);
    const recommendation=recommendStrategy({
      difficultySignal:learned?.difficultySignal??"insufficient_evidence",
      dominantError:calibrated?.dominantError??null,
      weakDimension:calibrated?.weakDimension??null,
      paceRatio:calibrated?.paceRatio??null,
      recentAccuracyPercent:learned?.latestDrift.recentAccuracyPercent??calibrated?.accuracyPercent??null,
    },histories);
    return {
      courseId:course.id,displayName:course.display_name,shortName:course.short_name,sortOrder:Number(course.sort_order),
      difficultySignal:learned?.difficultySignal??"insufficient_evidence",
      eligibleForExperiment:learned?.difficultySignal==="persistent"||learned?.difficultySignal==="structural",
      recommendation,experiments,
    };
  });
  return {courses,calibration,learning};
}

export async function getCourseStrategyPortfolio(requestedCourseId?:string|null){
  const data=await getSemesterStrategyPortfolios();
  const course=data.courses.find((item)=>item.courseId===requestedCourseId)
    ??data.courses.find((item)=>item.difficultySignal==="structural")
    ??data.courses.find((item)=>item.difficultySignal==="persistent")
    ??data.courses[0]??null;
  return {course,courses:data.courses};
}

export async function getStrategyPractice(courseId?:string|null,requestedStrategy?:string|null){
  const [portfolio,state]=await Promise.all([getCourseStrategyPortfolio(courseId),loadStrategyState()]);
  const course=portfolio.course;
  if(!course)return {course:null,strategy:null,queue:[],queueMinutes:0,completionNote:null};
  if(!course.eligibleForExperiment||course.recommendation.awaitingEvidence)return {course,strategy:null,queue:[],queueMinutes:0,completionNote:null};
  const requested=isStrategyKey(requestedStrategy)?strategyDefinition(requestedStrategy):null;
  const selected=requested&&course.recommendation.statusByKey[requested.key]!=="retired"
    ?requested
    :course.recommendation.recommended;
  if(!selected)return {course,strategy:null,queue:[],queueMinutes:0,completionNote:null};

  const questions=state.questions.filter((question)=>question.course_id===course.courseId);
  const skills:StrategySkill[]=state.skills.filter((skill)=>String(skill.course_id)===course.courseId).map((skill)=>({
    id:String(skill.id),title:String(skill.title),prerequisiteImportance:Number(skill.prerequisite_importance??0),
  }));
  const attempts:StrategyAttempt[]=state.attempts.filter((attempt)=>String(attempt.course_id)===course.courseId).map((attempt)=>({
    questionId:String(attempt.question_id),skillId:String(attempt.skill_id),evidenceDimension:attempt.evidence_dimension,
  }));
  const queue=buildStrategyQueue(selected,questions,skills,attempts);
  return {
    course,strategy:selected,queue,queueMinutes:queueMinutes(queue),
    completionNote:"strategy experiment:"+selected.key,
  };
}
