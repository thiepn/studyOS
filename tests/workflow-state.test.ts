import test from "node:test";
import assert from "node:assert/strict";
import { actionDescription, actionLabel, milestoneForAction } from "../src/lib/study/workflow-state.ts";

test("maps active workflow actions to the correct milestone", () => {
  assert.equal(milestoneForAction("retrieve_lecture"), "lecture_retrieval");
  assert.equal(milestoneForAction("attempt_exercise"), "exercise_attempt");
  assert.equal(milestoneForAction("reconcile_solution"), "solution_reconcile");
  assert.equal(milestoneForAction("weekly_checkpoint"), "weekly_checkpoint");
  assert.equal(milestoneForAction("await_solution"), null);
});

test("exposes meaningful labels and descriptions", () => {
  assert.equal(actionLabel("repair_findings"), "Repair solution findings");
  assert.match(actionDescription("attempt_exercise"), /before opening the official solution/i);
});
