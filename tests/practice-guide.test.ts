import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {practiceGuide} from "../src/lib/study/practice-guide.ts";
import type {StudyIndependence} from "../src/lib/supabase/database.types.ts";
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
const state=(independence:StudyIndependence="independent",phase:"answering"|"grading"|"submitting"="answering")=>
  practiceGuide({phase,sessionType:"coursework",independence,seconds:220,expectedMinutes:5,surface:"typed",completedQuestions:1,totalQuestions:4,queuedAttempts:0});
test("practice presentation states follow answer-lock stages without changing grades",()=>{
  assert.equal(state().step,"solve");
  assert.equal(state("hint_1").independenceLabel,"First hint used · assisted attempt");
  assert.equal(state("hint_2").independenceLabel,"Second hint used · assisted attempt");
  assert.equal(state("solution_exposed").independenceLabel,"Solution revealed before lock · no mastery credit");
  assert.equal(state("independent","grading").step,"compare");
  assert.equal(state("independent","submitting").step,"record");
  assert.equal(state("independent","grading").completedQuestions,1);
});
test("time context is informational and never a new deadline or mastery score",()=>{
  const x=practiceGuide({phase:"answering",sessionType:"checkpoint",independence:"independent",seconds:602,expectedMinutes:7,surface:"paper",completedQuestions:1,totalQuestions:3,queuedAttempts:2});
  assert.equal(x.exceedsTarget,true);assert.equal(x.elapsedMinutes,10);
  assert.equal(x.targetMinutes,7);assert.equal(x.workSurface,"Paper work");
  assert.equal(x.queuedAttempts,2);assert.equal(x.sessionLabel,"Cumulative checkpoint");
});
test("workspace keeps existing locking, hint, offline recovery and keyboard controls",()=>{
  const review=read("../src/components/review-session.tsx");
  const ui=read("../src/components/practice-focus-guide.tsx");
  const css=read("../src/app/practice-focus.css");
  assert.match(review,/<PracticeFocusGuide/);
  assert.match(review,/canRevealRubric\(confidence, answerSurface, composedResponse/);
  assert.match(review,/escalateIndependence\(x, "solution_exposed"\)/);
  assert.match(review,/submitAttemptWithFallback/);
  assert.match(review,/parseStudyDraft/);
  assert.match(review,/Ctrl\/⌘ \+ Enter to lock/);
  assert.match(ui,/aria-current=\{guide.step===key\?"step":undefined\}/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/@media\(forced-colors:active\)/);
  assert.doesNotMatch(css,/(?:linear|radial|conic)-gradient\(/);
});
