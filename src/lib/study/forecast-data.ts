import { createClient } from "@/lib/supabase/server";
import { ensureStudyWorkspace } from "./bootstrap";
import { StudyServiceError } from "./errors";
import { getSemesterPulse } from "./pulse";
import { getSemesterStrategyPortfolios } from "./strategy-data";
import { buildCourseForecast, summarizeSemesterForecast, type CourseForecast, type ForecastInput } from "./forecast";

export type SemesterForecast={
  courses:CourseForecast[];
  summary:ReturnType<typeof summarizeSemesterForecast>;
};

export function buildSemesterForecastFromEvidence(input:{
  risks:Array<any>;
  calibration:Array<any>;
  learning:Array<any>;
  strategy:Array<any>;
  courses:Array<any>;
  exams:Array<any>;
  results?:Array<any>;
}):SemesterForecast{
  const riskMap=new Map(input.risks.map((row)=>[String(row.course_id),row]));
  const calibrationMap=new Map(input.calibration.map((row)=>[String(row.courseId),row.profile]));
  const learningMap=new Map(input.learning.map((row)=>[String(row.courseId),row.analytics]));
  const strategyMap=new Map(input.strategy.map((row)=>[String(row.courseId),row]));
  const examMap=new Map(input.exams.map((row)=>[String(row.course_id),row]));
  const resultMap=new Map<string,any>();
  for(const row of input.results??[]){
    if(row.result_status!=="official")continue;
    const id=String(row.course_id);
    const current=resultMap.get(id);
    if(!current||Number(row.attempt_no)>Number(current.attempt_no))resultMap.set(id,row);
  }
  const courses=input.courses.map((course)=>{
    const risk=riskMap.get(String(course.id))??{};
    const calibrated=calibrationMap.get(String(course.id));
    const learned=learningMap.get(String(course.id));
    const portfolio=strategyMap.get(String(course.id));
    const exam=examMap.get(String(course.id))??{};
    const statuses=portfolio?.recommendation.statusByKey?Object.values(portfolio.recommendation.statusByKey):[];

    const forecastInput:ForecastInput={
      courseId:String(course.id),displayName:String(course.display_name),shortName:course.short_name==null?null:String(course.short_name),
      courseKind:String(course.course_kind??risk.course_kind??"major"),credits:course.credits==null?null:Number(course.credits),
      totalSkills:Number(risk.total_skills??0),testedSkills:Number(risk.tested_skills??0),
      coveragePercent:risk.coverage_percent==null?null:Number(risk.coverage_percent),
      durableMasteryPercent:risk.durable_mastery_percent==null?null:Number(risk.durable_mastery_percent),
      examReadyPercent:risk.exam_ready_percent==null?null:Number(risk.exam_ready_percent),
      independentSuccessPercent:risk.independent_success_percent_28d==null?null:Number(risk.independent_success_percent_28d),
      riskScore:Number(risk.risk_score??0),riskBand:String(risk.risk_band??"healthy"),
      actionableBacklog:Number(risk.actionable_backlog??0),dueOrAtRiskSkills:Number(risk.due_or_at_risk_skills??0),
      unresolvedErrors:Number(risk.unresolved_errors??0),operatingMode:risk.operating_mode==null?null:String(risk.operating_mode),
      daysToExam:risk.days_to_exam==null?null:Number(risk.days_to_exam),

      calibrationStatus:calibrated?.status??null,
      calibrationAccuracyPercent:calibrated?.accuracyPercent??null,
      calibrationIndependentAttempts:calibrated?.independentAttempts??0,
      calibrationNeeds:calibrated?.needsCalibration??false,

      driftBand:learned?.latestDrift.band??null,driftSufficient:learned?.latestDrift.sufficientData??false,
      driftScore:learned?.latestDrift.score??0,driftAccuracyDelta:learned?.latestDrift.accuracyDelta??null,
      driftCorrectionKind:learned?.latestDrift.correctionKind??null,driftCorrectionMinutes:learned?.latestDrift.correctionMinutes??0,

      difficultySignal:learned?.difficultySignal??null,evaluatedInterventions:learned?.evaluatedInterventions??0,
      interventionEffectivenessRate:learned?.effectivenessRate??null,
      latestInterventionOutcome:learned?.interventions[0]?.outcome??null,

      strategyAwaitingEvidence:portfolio?.recommendation.awaitingEvidence??false,
      strategyRecommendedKey:portfolio?.recommendation.recommended?.key??null,
      strategyRecommendedTitle:portfolio?.recommendation.recommended?.title??null,
      strategyRecommendedMinutes:portfolio?.recommendation.recommended?.budgetMinutes??null,
      strategyEscalation:portfolio?.recommendation.escalation??null,
      strategyProvenCount:statuses.filter((status)=>status==="proven").length,
      strategyPromisingCount:statuses.filter((status)=>status==="promising").length,
      strategyRetiredCount:statuses.filter((status)=>status==="retired").length,

      processedExams:Number(exam.processed_exams??0),simulatableExams:Number(exam.simulatable_exams??0),
      blueprintConfidence:exam.blueprint_confidence==null?null:exam.blueprint_confidence,
      verifiedSolutionCoveragePercent:exam.verified_solution_coverage_percent==null?null:Number(exam.verified_solution_coverage_percent),
      lastVerifiedScorePercent:exam.last_verified_score_percent==null?null:Number(exam.last_verified_score_percent),
      lastVerifiedCoveragePercent:exam.last_verified_coverage_percent==null?null:Number(exam.last_verified_coverage_percent),
      examNextAction:exam.next_action==null?null:String(exam.next_action),
      examNextActionReason:exam.next_action_reason==null?null:String(exam.next_action_reason),
      examStrategyDurationMinutes:exam.strategy_duration_minutes==null?null:Number(exam.strategy_duration_minutes),
    };
    let forecast=buildCourseForecast(forecastInput);
    const outcome=resultMap.get(String(course.id));
    if(outcome?.retake_decision==="pending"){
      forecast={
        ...forecast,
        decisionPriority:0,
        summary:"Official non-passing outcome recorded. Study allocation is paused until the retake decision is resolved.",
        nextAction:{
          kind:"retake_decision",title:"Resolve retake decision",
          reason:"Study allocation is paused until you explicitly choose whether and when this course will be retaken.",
          href:"/exam-results",estimatedMinutes:5,expectedValue:100,authority:"P24",
        },
      };
    }
    return {sortOrder:Number(course.sort_order??0),forecast};
  }).sort((a,b)=>a.sortOrder-b.sortOrder).map((row)=>row.forecast);
  return {courses,summary:summarizeSemesterForecast(courses)};
}

export async function getSemesterForecast():Promise<SemesterForecast>{
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;

  const [pulse,strategy,courseResult,examResult,resultResult]=await Promise.all([
    getSemesterPulse(),
    getSemesterStrategyPortfolios(),
    db.from("study_courses").select("id,display_name,short_name,sort_order,course_kind,credits").eq("semester_id",semesterId).eq("active",true).order("sort_order"),
    db.from("study_exam_strategy").select("*").eq("semester_id",semesterId),
    db.from("study_exam_results").select("course_id,attempt_no,result_status,outcome,retake_decision")
      .eq("semester_id",semesterId).eq("result_status","official").order("attempt_no",{ascending:false}),
  ]);
  const error=courseResult.error||examResult.error||resultResult.error;
  if(error)throw new StudyServiceError("Could not load semester forecast evidence",error.code||"forecast_read_failed",error);

  return buildSemesterForecastFromEvidence({
    risks:pulse.risks,calibration:strategy.calibration,learning:strategy.learning.courses,strategy:strategy.courses,
    courses:(courseResult.data??[]) as Array<any>,exams:(examResult.data??[]) as Array<any>,
    results:(resultResult.data??[]) as Array<any>,
  });
}
