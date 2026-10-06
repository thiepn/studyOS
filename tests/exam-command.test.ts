import test from "node:test";
import assert from "node:assert/strict";
import { buildExamCommand, examCommandDirective, type ExamCommandInputCourse } from "../src/lib/study/exam-command.ts";

const c=(id:string,days:number,overrides:Partial<ExamCommandInputCourse>={}):ExamCommandInputCourse=>({
  courseId:id,displayName:id.toUpperCase(),shortName:id.toUpperCase(),operatingMode:"exam",daysToExam:days,
  readinessIndex:70,band:"pass_ready",trajectory:"stable",decisionPriority:50,
  nextAction:"repair_weaknesses",nextActionTitle:"Repair weaknesses",nextActionHref:"/courses/"+id,nextActionMinutes:45,
  lastSimulationAt:null,lastVerifiedScorePercent:70,...overrides,
});
const days=(n=7)=>Array.from({length:n},(_,i)=>({date:"2026-10-"+String(6+i).padStart(2,"0"),availableMinutes:150}));

test("inactive courses do not activate the command center",()=>{
  const result=buildExamCommand({nowIso:"2026-10-06T10:00:00Z",courses:[c("dgl",30,{operatingMode:"normal"})],dayCapacities:days()});
  assert.equal(result.level,"inactive");
  assert.equal(result.activeExamCount,0);
});

test("two urgent exams create a critical conflict and rank higher-risk runway first",()=>{
  const result=buildExamCommand({
    nowIso:"2026-10-06T10:00:00Z",dayCapacities:days(),
    courses:[c("ti",5,{readinessIndex:80,decisionPriority:40}),c("dgl",2,{readinessIndex:55,band:"fragile",decisionPriority:75})],
  });
  assert.equal(result.level,"critical_conflict");
  assert.equal(result.courses[0].courseId,"dgl");
  assert.ok(result.courses[0].p10PriorityAdjustment>result.courses[1].p10PriorityAdjustment);
});

test("exam day never receives extra P9 preparation",()=>{
  const command=buildExamCommand({nowIso:"2026-10-06T10:00:00Z",courses:[c("dgl",0)],dayCapacities:days()});
  const directive=examCommandDirective(command,"dgl");
  assert.equal(directive.eligible,false);
  assert.equal(command.courses[0].conflict,"exam_today");
});

test("full timed simulation is blocked inside the final 24 hour runway",()=>{
  const command=buildExamCommand({
    nowIso:"2026-10-06T10:00:00Z",dayCapacities:days(),
    courses:[c("dgl",1,{nextAction:"timed_paper",nextActionTitle:"Timed paper",nextActionMinutes:120})],
  });
  assert.equal(command.courses[0].todayEligible,false);
  assert.equal(command.courses[0].conflict,"final_day_heavy");
});

test("recent full simulation enforces a recovery cooldown",()=>{
  const command=buildExamCommand({
    nowIso:"2026-10-06T10:00:00Z",dayCapacities:days(),
    courses:[c("dgl",5,{nextAction:"timed_paper",nextActionTitle:"Timed paper",nextActionMinutes:120,lastSimulationAt:"2026-10-05T08:00:00Z"})],
  });
  assert.equal(command.courses[0].conflict,"simulation_cooldown");
  assert.equal(command.courses[0].todayEligible,false);
});

test("only one heavy exam action owns Today during a cross-exam collision",()=>{
  const command=buildExamCommand({
    nowIso:"2026-10-06T10:00:00Z",dayCapacities:days(),
    courses:[
      c("dgl",6,{nextAction:"timed_paper",nextActionTitle:"DGL timed",nextActionMinutes:120,decisionPriority:80}),
      c("ti",8,{nextAction:"timed_paper",nextActionTitle:"TI timed",nextActionMinutes:120,decisionPriority:60}),
    ],
  });
  assert.equal(command.courses.filter(row=>row.todayEligible&&row.heavy).length,1);
  assert.equal(command.courses.find(row=>row.courseId==="ti")?.conflict,"cross_exam_heavy");
});

test("runway preview separates heavy exam actions by a clear day",()=>{
  const command=buildExamCommand({
    nowIso:"2026-10-06T10:00:00Z",dayCapacities:days(),
    courses:[
      c("dgl",7,{nextAction:"timed_paper",nextActionTitle:"DGL timed",nextActionMinutes:120,decisionPriority:80}),
      c("ti",9,{nextAction:"timed_paper",nextActionTitle:"TI timed",nextActionMinutes:120,decisionPriority:60}),
    ],
  });
  const heavyDays=command.days.map((day,i)=>day.heavySimulationCourseId?i:null).filter((x):x is number=>x!=null);
  assert.equal(heavyDays.length,2);
  assert.ok(heavyDays[1]-heavyDays[0]>=2);
});

test("P22 never changes the P9 action identity",()=>{
  const input=c("dgl",4,{nextAction:"verify_solutions",nextActionTitle:"Verify solutions",nextActionHref:"/courses/dgl",nextActionMinutes:30});
  const command=buildExamCommand({nowIso:"2026-10-06T10:00:00Z",courses:[input],dayCapacities:days()});
  assert.equal(command.courses[0].nextAction,"verify_solutions");
  assert.equal(command.courses[0].nextActionTitle,"Verify solutions");
  assert.equal(command.courses[0].nextActionHref,"/courses/dgl");
});


test("a heavy action that cannot fit Today does not block a smaller heavy exam action",()=>{
  const command=buildExamCommand({
    nowIso:"2026-10-06T10:00:00Z",
    dayCapacities:[{date:"2026-10-06",availableMinutes:90},...days().slice(1)],
    courses:[
      c("dgl",6,{nextAction:"timed_paper",nextActionTitle:"DGL timed",nextActionMinutes:120,decisionPriority:90}),
      c("ti",8,{nextAction:"repair_weaknesses",nextActionTitle:"TI repair",nextActionMinutes:75,decisionPriority:60}),
    ],
  });
  assert.equal(command.courses.find(row=>row.courseId==="ti")?.todayEligible,true);
});

test("simulation cooldown shifts preview placement off Today",()=>{
  const command=buildExamCommand({
    nowIso:"2026-10-06T10:00:00Z",dayCapacities:days(),
    courses:[c("dgl",6,{nextAction:"timed_paper",nextActionTitle:"Timed paper",nextActionMinutes:120,lastSimulationAt:"2026-10-05T12:00:00Z"})],
  });
  assert.notEqual(command.courses[0].scheduledDate,"2026-10-06");
});
