import type { StudyEvidenceDimension, StudyErrorType } from "@/lib/supabase/database.types";
import type { QueueItem, StudyQuestion } from "./types";

export type StrategyKey=
  |"concept_reconstruction"
  |"method_discrimination"
  |"worked_example_fading"
  |"timed_execution"
  |"interleaved_transfer"
  |"prerequisite_repair"
  |"oral_explanation";

export type StrategyStatus="untested"|"testing"|"promising"|"proven"|"retired";
export type StrategyEscalation="none"|"change_source"|"external_support";

export type StrategyDefinition={
  key:StrategyKey;
  title:string;
  purpose:string;
  instructions:string;
  targetDimensions:StudyEvidenceDimension[];
  targetErrors:StudyErrorType[];
  targetDifficulty:number;
  budgetMinutes:number;
  maxQuestions:number;
};

export type StrategyHistory={
  key:StrategyKey;
  experiments:number;
  evaluated:number;
  effective:number;
  pending:number;
  effectivenessRate:number|null;
  latestOutcome:"pending"|"insufficient_evidence"|"effective"|"unchanged"|"regressed"|null;
};

export type StrategySignal={
  difficultySignal:"insufficient_evidence"|"transient"|"responsive"|"persistent"|"structural";
  dominantError:StudyErrorType|null;
  weakDimension:StudyEvidenceDimension|null;
  paceRatio:number|null;
  recentAccuracyPercent:number|null;
};

export type StrategyRecommendation={
  recommended:StrategyDefinition|null;
  ranked:StrategyDefinition[];
  histories:StrategyHistory[];
  statusByKey:Record<StrategyKey,StrategyStatus>;
  escalation:StrategyEscalation;
  reason:string;
  awaitingEvidence:boolean;
};

export type StrategySkill={id:string;title:string;prerequisiteImportance:number};
export type StrategyAttempt={questionId:string;skillId:string;evidenceDimension:StudyEvidenceDimension};

export const STRATEGIES:StrategyDefinition[]=[
  {
    key:"concept_reconstruction",title:"Concept reconstruction",
    purpose:"Rebuild definitions, theorem conditions, and core relationships from memory before solving.",
    instructions:"Before each answer, state the relevant definition/result and its assumptions from memory. Then solve without notes.",
    targetDimensions:["recall","recognition"],targetErrors:["concept","recall"],targetDifficulty:2,budgetMinutes:20,maxQuestions:4,
  },
  {
    key:"method_discrimination",title:"Method discrimination",
    purpose:"Train choosing the right method before doing calculations or proof execution.",
    instructions:"For each problem, first name the method and one reason it applies. Lock that choice before carrying out the solution.",
    targetDimensions:["recognition","execution"],targetErrors:["recognition","method_selection","misreading"],targetDifficulty:3,budgetMinutes:20,maxQuestions:5,
  },
  {
    key:"worked_example_fading",title:"Worked-example fading",
    purpose:"Bridge from understood examples to independent execution with progressively less support.",
    instructions:"Attempt independently first. If blocked, use only Hint 1, restart the step, and finish without exposing the full solution.",
    targetDimensions:["execution","recall"],targetErrors:["concept","execution","calculation","programming_bug"],targetDifficulty:2,budgetMinutes:20,maxQuestions:4,
  },
  {
    key:"timed_execution",title:"Timed execution",
    purpose:"Improve fluent execution when knowledge is present but solving is too slow or error-prone under time.",
    instructions:"Commit to the target time before starting. Prioritize a clean method and final answer over exploratory detours.",
    targetDimensions:["execution","exam"],targetErrors:["time_management","execution","calculation","programming_bug"],targetDifficulty:3,budgetMinutes:15,maxQuestions:4,
  },
  {
    key:"interleaved_transfer",title:"Interleaved transfer",
    purpose:"Force discrimination and transfer across different skills instead of repeating one familiar pattern.",
    instructions:"Do not batch similar problems. Before solving, identify what makes this problem different from the previous one.",
    targetDimensions:["transfer","exam"],targetErrors:["method_selection","recognition","concept"],targetDifficulty:4,budgetMinutes:20,maxQuestions:5,
  },
  {
    key:"prerequisite_repair",title:"Prerequisite repair",
    purpose:"Rebuild high-leverage foundational skills that may be causing repeated downstream failures.",
    instructions:"Treat each item as a foundation check. Explain why the prerequisite matters for later material before solving.",
    targetDimensions:["recall","recognition","execution"],targetErrors:["concept","recall","method_selection"],targetDifficulty:2,budgetMinutes:20,maxQuestions:4,
  },
  {
    key:"oral_explanation",title:"Oral explanation",
    purpose:"Expose hidden conceptual gaps by explaining the idea and reasoning aloud before writing.",
    instructions:"Explain the concept, method, and assumptions aloud as if teaching someone else. Only then write the final solution.",
    targetDimensions:["recall","transfer"],targetErrors:["concept","recall","proof_structure"],targetDifficulty:3,budgetMinutes:15,maxQuestions:4,
  },
];

const BY_KEY=new Map(STRATEGIES.map((strategy)=>[strategy.key,strategy]));
export function isStrategyKey(value:string|undefined|null):value is StrategyKey{return Boolean(value&&BY_KEY.has(value as StrategyKey));}
export function strategyDefinition(key:StrategyKey){return BY_KEY.get(key)!;}

function historyStatus(history:StrategyHistory|undefined):StrategyStatus{
  if(!history||!history.experiments)return "untested";
  if(!history.evaluated)return "testing";
  if(history.evaluated>=2&&history.effective===0)return "retired";
  if(history.evaluated>=2&&Number(history.effectivenessRate)>=60)return "proven";
  if(history.effective>=1)return "promising";
  return "testing";
}

function baseRank(strategy:StrategyDefinition,signal:StrategySignal){
  let score=0;
  if(signal.dominantError&&strategy.targetErrors.includes(signal.dominantError))score+=9;
  if(signal.weakDimension&&strategy.targetDimensions.includes(signal.weakDimension))score+=6;
  if(signal.paceRatio!=null&&signal.paceRatio>1.3&&strategy.key==="timed_execution")score+=10;
  if(signal.recentAccuracyPercent!=null&&signal.recentAccuracyPercent<55&&["concept_reconstruction","worked_example_fading","prerequisite_repair"].includes(strategy.key))score+=3;
  if(signal.difficultySignal==="structural"&&["prerequisite_repair","oral_explanation","interleaved_transfer"].includes(strategy.key))score+=3;
  return score;
}

export function recommendStrategy(signal:StrategySignal,histories:StrategyHistory[]):StrategyRecommendation{
  const historyMap=new Map(histories.map((history)=>[history.key,history]));
  const statusByKey={} as Record<StrategyKey,StrategyStatus>;
  for(const strategy of STRATEGIES)statusByKey[strategy.key]=historyStatus(historyMap.get(strategy.key));

  const unresolved=histories.find((history)=>history.latestOutcome==="pending");
  const available=STRATEGIES.filter((strategy)=>statusByKey[strategy.key]!=="retired");
  if(unresolved){
    return {
      recommended:null,ranked:available,histories,statusByKey,escalation:"none",awaitingEvidence:true,
      reason:"A method experiment is still awaiting clean follow-up evidence. Keep normal coursework/review running and do not start another method experiment yet.",
    };
  }
  if(!available.length){
    return {
      recommended:null,ranked:[],histories,statusByKey,escalation:"external_support",awaitingEvidence:false,
      reason:"All in-app method families have failed repeated transfer checks. Stop cycling practice formats and escalate to a lecturer, tutorial, office hour, tutor, or another qualified human source.",
    };
  }

  const ranked=[...available].sort((a,b)=>{
    const aStatus=statusByKey[a.key],bStatus=statusByKey[b.key];
    const aHistory=historyMap.get(a.key),bHistory=historyMap.get(b.key);
    const aScore=baseRank(a,signal)+(aStatus==="proven"?12:aStatus==="promising"?6:0)+(aStatus==="testing"?-2:0)+(aHistory?.latestOutcome==="regressed"?-8:0);
    const bScore=baseRank(b,signal)+(bStatus==="proven"?12:bStatus==="promising"?6:0)+(bStatus==="testing"?-2:0)+(bHistory?.latestOutcome==="regressed"?-8:0);
    return bScore-aScore||STRATEGIES.indexOf(a)-STRATEGIES.indexOf(b);
  });

  const recommended=ranked[0]??null;
  let escalation:StrategyEscalation="none";
  let reason=recommended
    ? recommended.title+" best matches the current error/evidence signal and has not been retired by transfer evidence."
    : "No method is currently available.";

  const retiredCount=STRATEGIES.filter((strategy)=>statusByKey[strategy.key]==="retired").length;
  if(signal.difficultySignal==="structural"&&retiredCount>=3){
    escalation="change_source";
    reason+=" Multiple distinct methods have already failed, so pair this experiment with a different explanation/source rather than repeating the same material.";
  }

  return {recommended,ranked,histories,statusByKey,escalation,reason,awaitingEvidence:false};
}

function queueRank(
  question:StudyQuestion,
  strategy:StrategyDefinition,
  attemptedQuestionIds:Set<string>,
  usedSkillCounts:Map<string,number>,
  skillMap:Map<string,StrategySkill>,
){
  let rank=0;
  if(attemptedQuestionIds.has(question.id))rank+=4;
  rank+=Math.abs(Number(question.difficulty)-strategy.targetDifficulty)*1.5;
  if(strategy.targetDimensions.includes(question.evidence_dimension))rank-=5;
  rank+=(usedSkillCounts.get(question.primary_skill_id)??0)*1.3;
  if(strategy.key==="prerequisite_repair"){
    rank-=Math.min(5,Number(skillMap.get(question.primary_skill_id)?.prerequisiteImportance??0));
  }
  return rank;
}

export function buildStrategyQueue(
  strategy:StrategyDefinition,
  questions:StudyQuestion[],
  skills:StrategySkill[],
  attempts:StrategyAttempt[],
):QueueItem[]{
  const skillMap=new Map(skills.map((skill)=>[skill.id,skill]));
  const attemptedQuestionIds=new Set(attempts.map((attempt)=>attempt.questionId));
  const skillAttemptCounts=new Map<string,number>();
  for(const attempt of attempts)skillAttemptCounts.set(attempt.skillId,(skillAttemptCounts.get(attempt.skillId)??0)+1);

  const sorted=questions
    .filter((question)=>question.active&&skillMap.has(question.primary_skill_id))
    .sort((a,b)=>queueRank(a,strategy,attemptedQuestionIds,skillAttemptCounts,skillMap)-queueRank(b,strategy,attemptedQuestionIds,skillAttemptCounts,skillMap));

  const queue:QueueItem[]=[];
  const selectedSkills=new Set<string>();
  let usedMinutes=0;
  for(const question of sorted){
    const minutes=Math.max(1,Math.ceil(Number(question.expected_minutes)));
    if(usedMinutes+minutes>strategy.budgetMinutes)continue;
    if(strategy.key==="interleaved_transfer"&&selectedSkills.has(question.primary_skill_id)&&queue.length<Math.min(strategy.maxQuestions,skills.length))continue;
    queue.push({
      skillId:question.primary_skill_id,courseId:question.course_id,
      skillTitle:skillMap.get(question.primary_skill_id)?.title??"Skill",
      priorityScore:100-queueRank(question,strategy,attemptedQuestionIds,skillAttemptCounts,skillMap),
      targetDimension:question.evidence_dimension,
      question:{
        id:question.id,question_type:question.question_type,evidence_dimension:question.evidence_dimension,
        prompt:question.prompt,expected_minutes:question.expected_minutes,difficulty:question.difficulty,
        answer_key_or_rubric:question.answer_key_or_rubric,hint_1:question.hint_1,hint_2:question.hint_2,
      },
    });
    selectedSkills.add(question.primary_skill_id);
    usedMinutes+=minutes;
    if(queue.length>=strategy.maxQuestions||usedMinutes>=strategy.budgetMinutes)break;
  }
  return queue;
}
