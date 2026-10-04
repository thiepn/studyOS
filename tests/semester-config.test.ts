import test from "node:test";
import assert from "node:assert/strict";
import { WS2627_COURSES, WS2627_START_DATE } from "../src/lib/study/semester-config.ts";

test("WS26/27 starts on the intended semester date", () => {
  assert.equal(WS2627_START_DATE, "2026-10-12");
});

test("the six production courses are real names, ordered, and uniquely keyed", () => {
  assert.equal(WS2627_COURSES.length, 6);
  assert.deepEqual(WS2627_COURSES.map((course) => course.displayName), [
    "Differentialgleichungen",
    "Einführung in die Stochastik",
    "Theoretische Informatik",
    "Algorithmische Mathematik und Programmieren",
    "Einführung in die Programmierung",
    "Grundzüge der Mikroökonomik",
  ]);
  assert.equal(new Set(WS2627_COURSES.map((course) => course.stableKey)).size, 6);
  assert.deepEqual(WS2627_COURSES.map((course) => course.sortOrder), [1,2,3,4,5,6]);
});
