import test from "node:test";
import assert from "node:assert/strict";
import { courseInitials, courseToneClass } from "../src/lib/study/course-visual.ts";

test("course tone is stable for the same stable key",()=>{
  assert.equal(courseToneClass("dgl"),courseToneClass("dgl"));
  assert.match(courseToneClass("dgl"),/^course-tone-[1-6]$/);
});

test("course tone does not depend on display name",()=>{
  const stable=courseToneClass("stochastik");
  assert.equal(stable,courseToneClass("stochastik"));
});

test("course initials prefer short name and fall back to title initials",()=>{
  assert.equal(courseInitials("DGL","Differentialgleichungen"),"DGL");
  assert.equal(courseInitials(null,"Theoretische Informatik"),"TI");
});
