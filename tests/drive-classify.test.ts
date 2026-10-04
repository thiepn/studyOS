import test from "node:test";
import assert from "node:assert/strict";
import { classifyDriveFile } from "../src/lib/google-drive/classify.ts";

const courses = [
  { stableKey: "analysis_iii", displayName: "Analysis III" },
  { stableKey: "microeconomics_retake", displayName: "Microeconomics" },
];

test("course folder context dominates weak filename clues", () => {
  const result = classifyDriveFile("sheet-04.pdf", courses, { courseStableKey: "analysis_iii", weekNo: 4 });
  assert.equal(result.courseStableKey, "analysis_iii"); assert.equal(result.weekNo, 4); assert.ok(result.confidence >= 0.97);
});
test("classifies common exercise and solution names", () => {
  assert.equal(classifyDriveFile("Uebungsblatt 05.pdf", courses).resourceType, "exercise");
  assert.equal(classifyDriveFile("Musterloesung Blatt 05.pdf", courses).resourceType, "solution");
});
test("course name can resolve inbox material", () => {
  const result = classifyDriveFile("Microeconomics exercise sheet W03.pdf", courses);
  assert.equal(result.courseStableKey, "microeconomics_retake"); assert.equal(result.weekNo, 3);
});
