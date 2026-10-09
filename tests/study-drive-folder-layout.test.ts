import test from "node:test";
import assert from "node:assert/strict";
import {
  STUDY_DRIVE_ROOT_NAME, LEGACY_STUDY_DRIVE_ROOT_NAME,
  STUDY_COURSE_SUBFOLDERS, STUDY_COURSE_FOLDER_KEYS,
  safeStudyDriveFolderName, studyCourseFolderName,
} from "../src/lib/google-drive/folder-layout.ts";

test("new and legacy StudyOS roots remain stable", () => {
  assert.equal(STUDY_DRIVE_ROOT_NAME, "StudyOS");
  assert.equal(LEGACY_STUDY_DRIVE_ROOT_NAME, "Semester OS");
});
test("manually provisioned semester name matches app's canonical naming", () => {
  assert.equal(safeStudyDriveFolderName("Wintersemester 2026/27"), "Wintersemester 2026-27");
  assert.equal(safeStudyDriveFolderName("  WS26\\27  "), "WS26-27");
});
test("four actual optional course preset names adopt pre-created Drive folders", () => {
  assert.equal(studyCourseFolderName(10, "Differentialgleichungen"), "10_Differentialgleichungen");
  assert.equal(studyCourseFolderName(20, "Stochastik"), "20_Stochastik");
  assert.equal(studyCourseFolderName(30, "Theoretische Informatik"), "30_Theoretische Informatik");
  assert.equal(studyCourseFolderName(40, "Algorithmische Mathematik und Programmieren"),
    "40_Algorithmische Mathematik und Programmieren");
});
test("per-course category names and record keys preserve provisioning order", () => {
  assert.deepEqual([...STUDY_COURSE_SUBFOLDERS], [
    "00_COURSE", "01_WEEKS", "90_ALTKLAUSUREN",
    "91_SCRIPT", "92_REFERENCE", "99_SYSTEM",
  ]);
  assert.deepEqual([...STUDY_COURSE_FOLDER_KEYS], [
    "course", "weeks", "exams", "script", "reference", "system",
  ]);
  assert.equal(STUDY_COURSE_SUBFOLDERS.length, STUDY_COURSE_FOLDER_KEYS.length);
});
