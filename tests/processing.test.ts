import test from "node:test";
import assert from "node:assert/strict";
import { buildProcessingBrief, parseCandidateJsonText, processingProfile, type ProcessingPacket } from "../src/lib/study/processing-policy.ts";

const packet: ProcessingPacket = {
  schema_version: "studyos-processing-v1",
  ingestion_run_id: "11111111-1111-4111-8111-111111111111",
  course: { id: "c", stable_key: "programming_retake", display_name: "Einführung in die Programmierung", short_name: "EiP", course_kind: "retake", exam_format: null },
  resource: { id: "r", title: "Sheet 1", resource_type: "exercise", source_authority: "official_course", week_no: 1, drive_url: null, mime_type: "application/pdf", original_filename: "blatt1.pdf" },
  existing_course_map: [{ stable_key: "recursion", title: "Recursion", skills: [{ stable_key: "recursion:trace", title: "Trace recursive calls", kind: "programming", required_dimensions: ["execution"], exam_importance: 4, prerequisite_importance: 4 }] }],
  existing_exams: [],
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

test("exam processing separates official past-paper questions from generated review questions", () => {
  const brief=buildProcessingBrief({...packet,resource:{...packet.resource,resource_type:"exam",title:"Klausur WS25"}});
  assert.match(brief,/top-level exam\.questions/i);
  assert.match(brief,/Do not duplicate those official prompts inside skill\.questions/i);
  assert.match(brief,/syllabus_relevance defaults to 1\.0/i);
  assert.match(brief,/"answer_status": "missing"/i);
});

test("exam solution processing must reuse an existing exam key", () => {
  const brief=buildProcessingBrief({
    ...packet,
    resource:{...packet.resource,resource_type:"exam_solution",title:"Musterlösung WS25"},
    existing_exams:[{stable_key:"ws25_main",title:"Klausur WS25",active:true}],
  });
  assert.match(brief,/Match exam_solution\.exam_stable_key EXACTLY/i);
  assert.match(brief,/ws25_main/);
  assert.match(brief,/"topics": \[\]/);
});

test("candidate parser rejects wrong schema", () => {
  assert.throws(() => parseCandidateJsonText('{"topics":[]}'), /studyos-processing-v1/);
  const parsed = parseCandidateJsonText('{"schema_version":"studyos-processing-v1","topics":[]}');
  assert.deepEqual(parsed.topics, []);
});
