import type { StudyAttemptResult, StudyErrorType, StudyEvidenceDimension, StudyIndependence } from "@/lib/supabase/database.types";
import type { QueueItem, StudyQuestion } from "./types";

export type CalibrationStatus = "uncalibrated"|"emerging"|"usable"|"established";

export type CalibrationAttempt = {
  courseId:string;
  skillId:string;
  questionId:string;
  evidenceDimension:StudyEvidenceDimension;
  result:StudyAttemptResult;
  independence:StudyIndependence;
  selfConfidence:number|null;
  durationSeconds:number|null;
  expectedMinutes:number|null;
  errorTypes:StudyErrorType[];
  completedAt:string;
};

export type CalibrationProfile = {
  status:CalibrationStatus;
  attemptCount:number;
  independentAttempts:number;
  distinctSkills:number;
  accuracyPercent:number|null;
  averageConfidencePercent:number|null;
  confidenceGap:number|null;
  paceRatio:number|null;
  weakDimension:StudyEvidenceDimension|null;
  dominantError:StudyErrorType|null;
  recommendedDifficulty:number;
  targetIndependentAttempts:number;
  targetSkills:number;
  needsCalibration:boolean;
  recommendation:string;
};

const RESULT_SCORE:Record<StudyAttemptResult,number>={incorrect:0,partial:.5,correct:1};

function median(values:number[]){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
}

export function calibrationStatus(independentAttempts:number,distinctSkills:number):CalibrationStatus{
  if(independentAttempts<4||distinctSkills<2)return "uncalibrated";
  if(independentAttempts<8||distinctSkills<3)return "emerging";
  if(independentAttempts<16||distinctSkills<4)return "usable";
  return "established";
}

export function buildCalibrationProfile(attempts:CalibrationAttempt[]):CalibrationProfile{
  const credible=attempts.filter((a)=>a.independence!=="solution_exposed");
  const independent=credible.filter((a)=>a.independence==="independent");
  const distinctSkills=new Set(independent.map((a)=>a.skillId)).size;
  const status=calibrationStatus(independent.length,distinctSkills);
  const accuracyPercent=independent.length
    ? Math.round(independent.reduce((sum,a)=>sum+RESULT_SCORE[a.result],0)/independent.length*100)
    : null;

  const confidences=independent.filter((a)=>a.selfConfidence!=null).map((a)=>((Number(a.selfConfidence)-1)/4)*100);
  const averageConfidencePercent=confidences.length?Math.round(confidences.reduce((a,b)=>a+b,0)/confidences.length):null;
  const confidenceGap=averageConfidencePercent==null||accuracyPercent==null?null:Math.round(averageConfidencePercent-accuracyPercent);

  const pace=independent
    .filter((a)=>a.durationSeconds!=null&&a.expectedMinutes!=null&&Number(a.expectedMinutes)>0)
    .map((a)=>Math.min(3,Number(a.durationSeconds)/(Number(a.expectedMinutes)*60)));
  const paceRatio=median(pace);
  const roundedPace=paceRatio==null?null:Math.round(paceRatio*100)/100;

  const dimensionScores=new Map<StudyEvidenceDimension,{sum:number,count:number}>();
  for(const a of independent){
    const entry=dimensionScores.get(a.evidenceDimension)??{sum:0,count:0};
    entry.sum+=RESULT_SCORE[a.result];entry.count+=1;dimensionScores.set(a.evidenceDimension,entry);
  }
  const weakDimension=[...dimensionScores.entries()]
    .filter(([,v])=>v.count>=2)
    .sort((a,b)=>(a[1].sum/a[1].count)-(b[1].sum/b[1].count))[0]?.[0]??null;

  const errorCounts=new Map<StudyErrorType,number>();
  for(const a of credible){
    if(a.result==="correct")continue;
    for(const error of a.errorTypes)errorCounts.set(error,(errorCounts.get(error)??0)+1);
  }
  const dominantError=[...errorCounts.entries()].sort((a,b)=>b[1]-a[1])[0]??null;
  const stableDominantError=dominantError&&dominantError[1]>=2?dominantError[0]:null;

  let recommendedDifficulty=3;
  if(accuracyPercent!=null){
    if(accuracyPercent<45)recommendedDifficulty=2;
    else if(accuracyPercent>=80)recommendedDifficulty=4;
  }

  let recommendation="Keep sampling broadly across skills and evidence dimensions. Do not specialize from a few early attempts.";
  if(status==="usable"||status==="established"){
    if(confidenceGap!=null&&confidenceGap>=15)recommendation="Accuracy trails confidence. Keep answer-locking strict and favor independent checks before increasing difficulty.";
    else if(accuracyPercent!=null&&accuracyPercent<55)recommendation="Reduce difficulty one step and repair the weakest evidence dimension before adding harder transfer work.";
    else if(roundedPace!=null&&roundedPace>1.3)recommendation="Accuracy is usable but pace is slow. Add short timed execution sets without increasing total daily workload.";
    else if(weakDimension)recommendation="Use the normal mixed queue, with a mild preference for the weakest evidence dimension.";
    else recommendation="Calibration is stable enough for normal adaptive mixed practice.";
  }

  return {
    status,attemptCount:attempts.length,independentAttempts:independent.length,distinctSkills,
    accuracyPercent,averageConfidencePercent,confidenceGap,paceRatio:roundedPace,
    weakDimension,dominantError:stableDominantError,recommendedDifficulty,
    targetIndependentAttempts:12,targetSkills:4,
    needsCalibration:independent.length<12||distinctSkills<4,
    recommendation,
  };
}

function calibrationRank(
  question:StudyQuestion,
  profile:CalibrationProfile,
  attemptedQuestionIds:Set<string>,
  skillAttempts:Map<string,number>,
  dimensionAttempts:Map<StudyEvidenceDimension,number>,
){
  let rank=0;
  if(attemptedQuestionIds.has(question.id))rank+=7;
  rank+=(skillAttempts.get(question.primary_skill_id)??0)*1.5;
  rank+=(dimensionAttempts.get(question.evidence_dimension)??0)*.7;
  const targetDifficulty=(profile.status==="usable"||profile.status==="established")?profile.recommendedDifficulty:3;
  rank+=Math.abs(Number(question.difficulty)-targetDifficulty)*1.25;
  if((profile.status==="usable"||profile.status==="established")&&profile.weakDimension===question.evidence_dimension)rank-=3.5;
  return rank;
}

export function buildCalibrationQueue(
  questions:StudyQuestion[],
  skillTitles:Map<string,string>,
  attempts:CalibrationAttempt[],
  budgetMinutes=20,
  maxQuestions=5,
):QueueItem[]{
  const profile=buildCalibrationProfile(attempts);
  const attemptedQuestionIds=new Set(attempts.map((a)=>a.questionId));
  const skillAttempts=new Map<string,number>();
  const dimensionAttempts=new Map<StudyEvidenceDimension,number>();
  for(const a of attempts){
    if(a.independence!=="independent")continue;
    skillAttempts.set(a.skillId,(skillAttempts.get(a.skillId)??0)+1);
    dimensionAttempts.set(a.evidenceDimension,(dimensionAttempts.get(a.evidenceDimension)??0)+1);
  }

  const sorted=[...questions]
    .filter((q)=>q.active&&skillTitles.has(q.primary_skill_id))
    .sort((a,b)=>calibrationRank(a,profile,attemptedQuestionIds,skillAttempts,dimensionAttempts)-calibrationRank(b,profile,attemptedQuestionIds,skillAttempts,dimensionAttempts));

  const queue:QueueItem[]=[];
  const usedSkills=new Set<string>();
  let used=0;
  for(const question of sorted){
    const minutes=Math.max(1,Math.ceil(Number(question.expected_minutes)));
    if(used+minutes>budgetMinutes)continue;
    if(usedSkills.has(question.primary_skill_id)&&queue.length<Math.min(maxQuestions,skillTitles.size))continue;
    queue.push({
      skillId:question.primary_skill_id,
      courseId:question.course_id,
      skillTitle:skillTitles.get(question.primary_skill_id)??"Skill",
      priorityScore:100-calibrationRank(question,profile,attemptedQuestionIds,skillAttempts,dimensionAttempts),
      targetDimension:question.evidence_dimension,
      question:{
        id:question.id,question_type:question.question_type,evidence_dimension:question.evidence_dimension,
        prompt:question.prompt,expected_minutes:question.expected_minutes,difficulty:question.difficulty,
        answer_key_or_rubric:question.answer_key_or_rubric,hint_1:question.hint_1,hint_2:question.hint_2,
      },
    });
    usedSkills.add(question.primary_skill_id);used+=minutes;
    if(queue.length>=maxQuestions||used>=budgetMinutes)break;
  }
  return queue;
}
