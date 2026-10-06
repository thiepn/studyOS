import test from "node:test";
import assert from "node:assert/strict";
import { buildExamOperations, examBoundaryState, examRecoveryDirective, shouldFreezeCourseDiscretionary } from "../src/lib/study/exam-operations.ts";

const exam=(id:string,at="2026-10-06T10:00:00Z",duration=120)=>({
  courseId:id,displayName:id.toUpperCase(),shortName:id.toUpperCase(),examAt:at,durationMinutes:duration,
});

test("exam boundary distinguishes final window, in-progress, recovery and post-exam",()=>{
  assert.equal(examBoundaryState(exam("dgl"),"2026-10-06T09:00:00Z").phase,"final_window");
  assert.equal(examBoundaryState(exam("dgl"),"2026-10-06T11:00:00Z").phase,"in_progress");
  assert.equal(examBoundaryState(exam("dgl"),"2026-10-06T13:00:00Z").phase,"recovery_full");
  assert.equal(examBoundaryState(exam("dgl"),"2026-10-06T18:00:00Z").phase,"recovery_light");
  assert.equal(examBoundaryState(exam("dgl"),"2026-10-07T01:00:00Z").phase,"post_exam");
});

test("closure is not eligible until the configured exam duration has ended",()=>{
  assert.equal(examBoundaryState(exam("dgl"),"2026-10-06T11:59:00Z").closureEligible,false);
  assert.equal(examBoundaryState(exam("dgl"),"2026-10-06T12:00:00Z").closureEligible,true);
});

test("in-progress exam freezes competing exam preparation",()=>{
  const operations=buildExamOperations({nowIso:"2026-10-06T11:00:00Z",courses:[exam("dgl"),exam("ti","2026-10-10T10:00:00Z")]});
  assert.equal(examRecoveryDirective({operations,courseId:"ti",heavy:false}).eligible,false);
});

test("first four hours after an exam block all competing exam work",()=>{
  const operations=buildExamOperations({nowIso:"2026-10-06T14:00:00Z",courses:[exam("dgl"),exam("ti","2026-10-10T10:00:00Z")]});
  const directive=examRecoveryDirective({operations,courseId:"ti",heavy:false});
  assert.equal(operations.recoveryLevel,"full");
  assert.equal(directive.eligible,false);
});

test("four-to-twelve-hour recovery allows light work but blocks heavy work",()=>{
  const operations=buildExamOperations({nowIso:"2026-10-06T19:00:00Z",courses:[exam("dgl"),exam("ti","2026-10-10T10:00:00Z")]});
  assert.equal(examRecoveryDirective({operations,courseId:"ti",heavy:true}).eligible,false);
  const light=examRecoveryDirective({operations,courseId:"ti",heavy:false});
  assert.equal(light.eligible,true);
  assert.equal(light.priorityAdjustment,-6);
});

test("completed course discretionary work remains frozen after recovery",()=>{
  const operations=buildExamOperations({nowIso:"2026-10-07T06:00:00Z",courses:[exam("dgl")]});
  assert.equal(shouldFreezeCourseDiscretionary(operations.courses[0]),true);
});

test("unconfigured exams do not create recovery state",()=>{
  const operations=buildExamOperations({nowIso:"2026-10-06T12:00:00Z",courses:[{...exam("dgl"),examAt:null}]});
  assert.equal(operations.courses[0].phase,"unconfigured");
  assert.equal(operations.recoveryLevel,"none");
});
