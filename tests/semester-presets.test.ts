import test from "node:test";
import assert from "node:assert/strict";
import {THIRD_SEMESTER_PRESETS,availablePresets} from "../src/lib/study/semester-presets.ts";

test("correct course priority without automatically creating any student records",()=>{
  assert.deepEqual(THIRD_SEMESTER_PRESETS.map(p=>p.shortName),["DGL","Stoch","TI","AMP"]);
  assert.ok(THIRD_SEMESTER_PRESETS.every(p=>p.courseKind==="major"));
  assert.equal(new Set(THIRD_SEMESTER_PRESETS.map(p=>p.stableKey)).size,4);
  assert.ok(THIRD_SEMESTER_PRESETS.every(p=>!Object.hasOwn(p,"examAt")&&!Object.hasOwn(p,"credits")));
});
test("already configured courses are not advertised as new templates",()=>{
  assert.deepEqual(availablePresets(["differentialgleichungen","stochastik"])
    .map(p=>p.shortName),["TI","AMP"]);
  assert.deepEqual(availablePresets(THIRD_SEMESTER_PRESETS.map(p=>p.stableKey)),[]);
});
