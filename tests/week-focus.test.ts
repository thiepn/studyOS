import test from "node:test";
import assert from "node:assert/strict";
import { featuredTeachingWeek, orderedTeachingWeeks } from "../src/lib/study/week-focus.ts";

const week=(id:string,no:number,next_action:string)=>({teaching_week_id:id,week_no:no,next_action});

test("earliest actionable teaching week is featured regardless of incoming order",()=>{
  const weeks=[week("w5",5,"await_material"),week("w3",3,"attempt_exercise"),week("w1",1,"maintain"),week("w2",2,"retrieve_lecture")];
  assert.equal(featuredTeachingWeek(weeks),"w2");
  assert.deepEqual(weeks.map(w=>w.teaching_week_id),["w5","w3","w1","w2"]);
});
test("pending material falls behind actual executable work",()=>{
  assert.equal(featuredTeachingWeek([week("w1",1,"await_solution"),week("w2",2,"repair_findings")]),"w2");
});
test("if no action is executable, most recent pending week is featured",()=>{
  assert.equal(featuredTeachingWeek([week("w1",1,"maintain"),week("w2",2,"await_material"),week("w3",3,"await_exercise")]),"w3");
});
test("completed course and empty course have stable fallbacks",()=>{
  assert.equal(featuredTeachingWeek([week("w1",1,"maintain"),week("w2",2,"maintain")]),"w2");
  assert.equal(featuredTeachingWeek([]),null);
});

test("featured week renders first without mutating source order",()=>{
  const original=[week("w5",5,"await_material"),week("w1",1,"maintain"),week("w3",3,"attempt_exercise")];
  assert.deepEqual(orderedTeachingWeeks(original).map(w=>w.teaching_week_id),["w3","w1","w5"]);
  assert.deepEqual(original.map(w=>w.teaching_week_id),["w5","w1","w3"]);
});
