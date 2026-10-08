import test from "node:test";
import assert from "node:assert/strict";
import { assessmentReady, canRevealRubric, escalateIndependence, isMasteryCreditable } from "../src/lib/study/review-state.ts";

test("help can only worsen independence", () => {
  assert.equal(escalateIndependence("independent","hint_1"),"hint_1");
  assert.equal(escalateIndependence("hint_2","hint_1"),"hint_2");
  assert.equal(escalateIndependence("hint_1","solution_exposed"),"solution_exposed");
});
test("revealing a solution before locking removes mastery credit", () => {
  assert.equal(isMasteryCreditable("independent"),true); assert.equal(isMasteryCreditable("hint_2"),true); assert.equal(isMasteryCreditable("solution_exposed"),false);
});
test("pre-reveal confidence and a real attempt are required for a lock", () => {
  assert.equal(canRevealRubric(null,"paper",""),false);
  assert.equal(canRevealRubric(3,"typed","  "),false);
  assert.equal(canRevealRubric(3,"typed","x = 2"),true);
  assert.equal(canRevealRubric(2,"paper",""),true);
  assert.equal(canRevealRubric(1,"typed","",true),true);
  assert.equal(canRevealRubric(0,"paper",""),false);
  assert.equal(canRevealRubric(6,"paper",""),false);
  assert.equal(canRevealRubric(2.5,"paper",""),false);
});

test("non-correct self grades require an error diagnosis", () => {
  assert.equal(assessmentReady("correct",3,[]),true); assert.equal(assessmentReady("partial",3,[]),false); assert.equal(assessmentReady("incorrect",4,["concept"]),true);
});
