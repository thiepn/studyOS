import test from "node:test";
import assert from "node:assert/strict";
import { buildProcessingBrief, parseCandidateJsonText, processingProfile, type ProcessingPacket } from "../src/lib/study/processing-policy.ts";

const packet: ProcessingPacket = {
  schema_version: "studyos-processing-v1",
  ingestion_run_id: "11111111-1111-4111-8111-111111111111",
  course: { id: "c", stable_key: "programming_retake", display_name: "Einführung in die Programmierung", short_name: "EiP", course_kind: "retake", exam_format: null },
  resource: { id: "r", title: "Sheet 1", resource_type: "exercise", source_authority: "official_course", week_no: 1, drive_url: null, mime_type: "application/pdf", original_filename: "blatt1.pdf" },
  existing_course_map: [{ stable_key: "recursion", title: "Recursion", skills: [{ stable_key: "recursion:trace", title: "Trace recursive calls", kind: "programming", required_dimensions: ["execution"], exam_importance: 4, prerequisite_importance: 4 }] }],
};

test("course profiles are domain specific", () => {
  assert.match(processingProfile("programming_retake"), /trace, implement, debug/i);
  assert.match(processingProfile("microeconomics_retake"), /graph.*derivation.*economic interpretation/i);
});

test("processing brief requires provenance and stable-key reuse", () => {
  const brief = buildProcessingBrief(packet);
  assert.match(brief, /Ground every extracted skill and every question/i);
  assert.match(brief, /Reuse existing topic\/skill stable_key/i);
  assert.match(brief, /recursion:trace/);
  assert.match(brief, /Output JSON only/i);
});

test("candidate parser rejects wrong schema", () => {
  assert.throws(() => parseCandidateJsonText('{"topics":[]}'), /studyos-processing-v1/);
  const parsed = parseCandidateJsonText('{"schema_version":"studyos-processing-v1","topics":[]}');
  assert.deepEqual(parsed.topics, []);
});