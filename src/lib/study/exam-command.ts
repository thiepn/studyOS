import type { ScenarioObjective } from "./scenario.ts";

export type ExamActionClass="simulation"|"repair"|"mixed"|"verification"|"evidence"|"other";
export type ExamConflictKind="none"|"exam_today"|"final_day_heavy"|"simulation_cooldown"|"cross_exam_heavy"|"capacity";
export type ExamCommandLevel="inactive"|"single_exam"|"multi_exam"|"compressed_conflict"|"critical_conflict";

export type ExamCommandInputCourse={
  courseId:string;
  displayName:string;
  shortName:string|null;
  operatingMode:string|null;
  daysToExam:number|null;
  readinessIndex:number|null;
  band:string;
  trajectory:string;
  decisionPriority:number;
  nextAction:string|null;
  nextActionTitle:string;
  nextActionHref:string;
  nextActionMinutes:number;
  lastSimulationAt:string|null;
  lastVerifiedScorePercent:number|null;
};

export type ExamDayCapacity={
  date:string;
  availableMinutes:number;
};

export type ExamCommandCourse=ExamCommandInputCourse&{
  actionClass:ExamActionClass;
  heavy:boolean;
  commandScore:number;
  rank:number;
  todayEligible:boolean;
  conflict:ExamConflictKind;
  conflictReason:string|null;
  p10PriorityAdjustment:number;
  scheduledDate:string|null;
  scheduleStatus:"today"|"scheduled"|"unplaced"|"blocked";
};

export type ExamCommandDay={
  date:string;
  availableMinutes:number;
  usedMinutes:number;
  remainingMinutes:number;
  heavySimulationCourseId:string|null;
  items:Array<{courseId:string;title:string;minutes:number;heavy:boolean}>;
};

export type ExamCommand={
  active:boolean;
  level:ExamCommandLevel;
  examObjective:ScenarioObjective;
  activeExamCount:number;
  compressedExamCount:number;
  urgentExamCount:number;
  courses:ExamCommandCourse[];
  days:ExamCommandDay[];
  summary:string;
};

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const dayMs=86_400_000;

export function classifyExamAction(action:string|null,minutes:number):{actionClass:ExamActionClass;heavy:boolean}{
  if(action==="baseline_timed_paper"||action==="timed_paper")return {actionClass:"simulation",heavy:true};
  if(action==="repair_weaknesses")return {actionClass:"repair",heavy:minutes>=75};
  if(action==="mixed_exam_practice")return {actionClass:"mixed",heavy:minutes>=75};
  if(action==="verify_solutions")return {actionClass:"verification",heavy:false};
  if(action==="process_past_exams"||action==="add_exam_evidence")return {actionClass:"evidence",heavy:false};
  return {actionClass:"other",heavy:minutes>=90};
}

function urgency(days:number|null){
  if(days==null)return 0;
  if(days<=0)return 100;
  if(days===1)return 96;
  if(days<=3)return 91;
  if(days<=7)return 82;
  if(days<=14)return 67;
  if(days<=21)return 52;
  return 25;
}

function scoreCourse(course:ExamCommandInputCourse){
  const readinessGap=course.readinessIndex==null?25:Math.max(0,100-course.readinessIndex);
  const bandBoost=course.band==="at_risk"?14:course.band==="fragile"?9:course.band==="pass_ready"?4:0;
  const trajectoryBoost=course.trajectory==="declining"?8:course.trajectory==="improving"?-3:0;
  const simulationGap=course.lastVerifiedScorePercent==null?5:Math.max(0,75-course.lastVerifiedScorePercent)*0.2;
  return Math.round(clamp(
    urgency(course.daysToExam)*0.48+
    readinessGap*0.20+
    course.decisionPriority*0.22+
    bandBoost+trajectoryBoost+simulationGap,
    0,100,
  ));
}

function daysSince(timestamp:string|null,nowIso:string){
  if(!timestamp)return Infinity;
  return (Date.parse(nowIso)-Date.parse(timestamp))/dayMs;
}

function commandLevel(active:ExamCommandInputCourse[]):ExamCommandLevel{
  if(!active.length)return "inactive";
  if(active.length===1)return "single_exam";
  const urgent=active.filter(course=>(course.daysToExam??999)<=7).length;
  const compressed=active.filter(course=>(course.daysToExam??999)<=21).length;
  if(urgent>=2)return "critical_conflict";
  if(compressed>=2)return "compressed_conflict";
  return "multi_exam";
}

function priorityAdjustment(rank:number,days:number|null,level:ExamCommandLevel){
  if(level==="inactive"||level==="single_exam")return 0;
  const base=rank===1?18:rank===2?10:rank===3?5:2;
  const urgentBoost=days!=null&&days<=3?4:days!=null&&days<=7?2:0;
  return base+urgentBoost;
}

export function buildExamCommand(input:{
  nowIso:string;
  courses:ExamCommandInputCourse[];
  dayCapacities:ExamDayCapacity[];
}):ExamCommand{
  const active=input.courses.filter(course=>
    ["transition","exam"].includes(String(course.operatingMode))&&
    course.daysToExam!=null&&course.daysToExam>=0&&
    course.nextAction&&course.nextAction!=="maintain_blueprint"
  );
  const level=commandLevel(active);
  const ranked=active
    .map(course=>({...course,...classifyExamAction(course.nextAction,course.nextActionMinutes),commandScore:scoreCourse(course)}))
    .sort((a,b)=>b.commandScore-a.commandScore||(a.daysToExam??999)-(b.daysToExam??999)||a.courseId.localeCompare(b.courseId));

  const courses:ExamCommandCourse[]=ranked.map((course,index)=>{
    let todayEligible=true;
    let conflict:ExamConflictKind="none";
    let conflictReason:string|null=null;
    if((course.daysToExam??999)<=0){
      todayEligible=false;conflict="exam_today";
      conflictReason="The exam is today. P22 does not schedule additional preparation into the exam day.";
    }else if(course.heavy&&(course.daysToExam??999)<=1){
      todayEligible=false;conflict="final_day_heavy";
      conflictReason="P9 still owns the timed/heavy action, but P22 will not place a heavy simulation inside the final 24-hour runway.";
    }else if(course.actionClass==="simulation"&&daysSince(course.lastSimulationAt,input.nowIso)<1.5){
      todayEligible=false;conflict="simulation_cooldown";
      conflictReason="A timed simulation was completed within roughly 36 hours. P22 protects recovery before another full simulation.";
    }
    return {
      ...course,rank:index+1,todayEligible,conflict,conflictReason,
      p10PriorityAdjustment:priorityAdjustment(index+1,course.daysToExam,level),
      scheduledDate:null,scheduleStatus:todayEligible?"unplaced":"blocked",
    };
  });

  // Only one heavy exam action may enter Today. Lower-ranked heavy actions remain P9-authoritative,
  // but P22 defers their execution to avoid cross-exam fatigue collisions.
  const todayCapacity=input.dayCapacities[0]?.availableMinutes??0;
  const todayHeavy=courses.filter(course=>course.todayEligible&&course.heavy&&course.nextActionMinutes<=todayCapacity);
  for(const course of todayHeavy.slice(1)){
    course.todayEligible=false;
    course.conflict="cross_exam_heavy";
    course.conflictReason="A higher-priority exam already owns today's heavy exam-work slot.";
    course.scheduleStatus="unplaced";
  }

  const days:ExamCommandDay[]=input.dayCapacities.map(day=>({
    date:day.date,availableMinutes:Math.max(0,Math.floor(day.availableMinutes)),
    usedMinutes:0,remainingMinutes:Math.max(0,Math.floor(day.availableMinutes)),
    heavySimulationCourseId:null,items:[],
  }));

  // Preview only the CURRENT P9 action for each exam. After completion P9 recalculates and P22 rebuilds.
  let lastHeavyIndex=-99;
  for(const course of courses){
    if(course.conflict==="exam_today")continue;
    const latestOffset=Math.max(0,(course.daysToExam??days.length)-1);
    const sinceLastSimulation=daysSince(course.lastSimulationAt,input.nowIso);
    const earliestOffset=course.actionClass==="simulation"&&sinceLastSimulation<1.5?1:0;
    let placed=false;
    for(let i=earliestOffset;i<days.length&&i<=latestOffset;i++){
      const day=days[i];
      if(day.remainingMinutes<course.nextActionMinutes)continue;
      if(course.heavy){
        // Keep at least one clear calendar day between heavy exam actions when the runway allows.
        if(i-lastHeavyIndex<2)continue;
        if((course.daysToExam??999)-i<=1)continue;
      }
      day.items.push({courseId:course.courseId,title:course.nextActionTitle,minutes:course.nextActionMinutes,heavy:course.heavy});
      day.usedMinutes+=course.nextActionMinutes;
      day.remainingMinutes=Math.max(0,day.availableMinutes-day.usedMinutes);
      if(course.heavy){day.heavySimulationCourseId=course.courseId;lastHeavyIndex=i;}
      course.scheduledDate=day.date;
      course.scheduleStatus=i===0?"today":"scheduled";
      placed=true;
      break;
    }
    if(!placed&&course.scheduleStatus!=="blocked"){
      course.scheduleStatus="unplaced";
      if(course.conflict==="none"){
        course.conflict="capacity";
        course.conflictReason="The current P9 action does not fit the protected seven-day capacity/runway without breaking exam-day or heavy-work spacing constraints.";
      }
    }
  }

  const urgent=courses.filter(course=>(course.daysToExam??999)<=7).length;
  const compressed=courses.filter(course=>(course.daysToExam??999)<=21).length;
  const unplaced=courses.filter(course=>course.scheduleStatus==="unplaced"||course.scheduleStatus==="blocked").length;
  const summary=!courses.length
    ?"No course is currently in an active P9 transition/exam runway."
    :unplaced
      ?unplaced+" active exam action"+(unplaced===1?" has":"s have")+" a capacity, fatigue, or final-runway conflict that needs attention."
      :courses.length+" active exam action"+(courses.length===1?" is":"s are")+" placeable inside the protected seven-day runway.";

  return {
    active:courses.length>0,level,examObjective:"exam_period",activeExamCount:courses.length,
    compressedExamCount:compressed,urgentExamCount:urgent,courses,days,summary,
  };
}

export function examCommandDirective(command:ExamCommand,courseId:string){
  const course=command.courses.find(row=>row.courseId===courseId);
  if(!course)return {eligible:true,priorityAdjustment:0,reason:null as string|null};
  return {
    eligible:course.todayEligible,
    priorityAdjustment:course.p10PriorityAdjustment,
    reason:course.conflictReason,
  };
}
