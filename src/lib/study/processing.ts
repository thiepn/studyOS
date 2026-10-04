import { createClient } from "@/lib/supabase/server";
import { StudyServiceError } from "./errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProcessingPacket = {
  schema_version: "studyos-processing-v1";
  ingestion_run_id: string;
  course: { id: string; stable_key: string; display_name: string; short_name: string | null; course_kind: string; exam_format: string | null; };
  resource: { id: string; title: string; resource_type: string; source_authority: string; week_no: number | null; drive_url: string | null; mime_type: string | null; original_filename: string | null; };
  existing_course_map: Array<{ stable_key: string; title: string; description?: string | null; first_week_no?: number | null; skills?: Array<{ stable_key: string; title: string; kind: string; required_dimensions: string[]; exam_importance: number; prerequisite_importance: number; }>; }>;
};

const COURSE_PROFILE: Record<string, string> = {
  major_01: "This is Differentialgleichungen. Prioritize definitions, theorem assumptions, method recognition, solution procedures, qualitative interpretation, proof ideas, calculations, and transfer. Do not label exam-like questions with the method to use. Method selection is evidence.",
  major_02: "This is Einführung in die Stochastik. Prioritize definitions, assumptions, probability-model recognition, distributions, derivations, calculations, interpretation, proof ideas, and transfer. Questions should test model selection as well as computation.",
  major_03: "This is Theoretische Informatik. Prioritize formal definitions, constructions, language/automata reasoning, proof structure, reductions, correctness arguments, and transfer. Keep formal statements precise; do not turn every definition into a trivial flashcard.",
  major_04: "This is Algorithmische Mathematik und Programmieren. Prioritize mathematical formulation, algorithm recognition, derivation, correctness reasoning, implementation, complexity, debugging, and transfer. Use code questions only where executable reasoning is genuinely part of the skill.",
  programming_retake: "This is Einführung in die Programmierung (retake). Prioritize trace, implement, debug, reason, complexity, and transfer. Passive code reading is not mastery. Prefer short executable tasks and bug diagnosis over vocabulary cards.",
  microeconomics_retake: "This is Grundzüge der Mikroökonomik (retake). Use the chain concept → assumptions → graph → derivation → economic interpretation → changed assumption. Questions should require interpreting what changes economically, not just reproducing algebra.",
};

export function processingProfile(stableKey: string) {
  return COURSE_PROFILE[stableKey] ?? "Extract reusable topics and atomic skills. Prefer retrieval, recognition, execution, transfer, and exam evidence over passive recognition.";
}

export function buildProcessingBrief(packet: ProcessingPacket) {
  const existing = JSON.stringify(packet.existing_course_map, null, 2);
  const schema = JSON.stringify({
    schema_version: "studyos-processing-v1",
    topics: [{
      stable_key: "lowercase_reusable_key", title: "Human topic title", description: "optional", first_week_no: packet.resource.week_no,
      skills: [{
        stable_key: "topic:atomic_skill", title: "Observable capability", description: "optional",
        skill_kind: "problem_solving", required_dimensions: ["recognition","execution"], exam_importance: 3, prerequisite_importance: 3,
        source: { page_start: 1, page_end: 2, section_label: "named section", relation_type: "introduces", confidence: 0.95 },
        questions: [{
          prompt: "Closed-book prompt", answer_key_or_rubric: "What a correct answer must contain",
          question_type: "short_application", evidence_dimension: "execution", origin: "generated", difficulty: 3, expected_minutes: 4, source_confidence: 0.95,
          hint_1: "optional", hint_2: "optional",
          source: { page_start: 1, page_end: 2, section_label: "named section", source_role: "basis" }
        }]
      }]
    }]
  }, null, 2);
  return [
    "Process the attached/source material for StudyOS.",
    "",
    "COURSE",
    packet.course.display_name + " (" + packet.course.stable_key + ")",
    processingProfile(packet.course.stable_key),
    "",
    "RESOURCE",
    "Title: " + packet.resource.title,
    "Type: " + packet.resource.resource_type,
    "Teaching week: " + (packet.resource.week_no ?? "unknown"),
    "Authority: " + packet.resource.source_authority,
    "",
    "NON-NEGOTIABLE RULES",
    "1. Ground every extracted skill and every question in the actual source. Each must include page_start/page_end or a named section_label.",
    "2. Reuse existing topic/skill stable_key values whenever the same concept already exists. Do not create synonyms just because wording differs.",
    "3. Keep skills atomic and observable: something the student can recall, recognize, prove, calculate, implement, debug, derive, interpret, or transfer.",
    "4. Default to 1–3 strong questions per skill. More than 6 usually indicates redundancy.",
    "5. Every question needs an answer_key_or_rubric.",
    "6. Do not award mastery for material merely being explained in the source.",
    "7. For exam-style prompts, do not reveal the theorem/method/algorithm to use unless method selection is not part of the skill.",
    "8. Preserve professor-specific definitions, notation, assumptions, and conventions. Do not silently replace them with generic textbook conventions.",
    "9. If the source is ambiguous, encode lower source confidence rather than inventing certainty.",
    "10. Output JSON only. No markdown fences and no prose before or after it.",
    "",
    "EXISTING COURSE MAP",
    "Reuse these keys when appropriate:",
    existing,
    "",
    "OUTPUT SCHEMA",
    schema,
  ].join("\n");
}

export async function getProcessingPacket(runId: string) {
  if (!UUID.test(runId)) throw new StudyServiceError("Invalid ingestion run", "invalid_candidate");
  const supabase = await createClient();
  const { data, error } = await (supabase.rpc as any)("study_get_processing_packet", { p_run_id: runId });
  if (error) throw new StudyServiceError("Could not prepare processing packet", error.code || "processing_packet_failed", error);
  const packet = data as ProcessingPacket;
  return { packet, brief: buildProcessingBrief(packet) };
}

export function parseCandidateJsonText(text: string) {
  if (!text.trim()) throw new StudyServiceError("Paste the processor JSON first", "invalid_candidate");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new StudyServiceError("Candidate is not valid JSON", "invalid_candidate"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new StudyServiceError("Candidate must be a JSON object", "invalid_candidate");
  const candidate = value as Record<string, unknown>;
  if (candidate.schema_version !== "studyos-processing-v1") throw new StudyServiceError("Candidate must use studyos-processing-v1", "invalid_candidate");
  if (!Array.isArray(candidate.topics)) throw new StudyServiceError("Candidate topics must be an array", "invalid_candidate");
  return candidate;
}