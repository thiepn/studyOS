export type ProcessingPacket = {
  schema_version: "studyos-processing-v1";
  ingestion_run_id: string;
  course: { id: string; stable_key: string; display_name: string; short_name: string | null; course_kind: string; exam_format: string | null; };
  resource: { id: string; title: string; resource_type: string; source_authority: string; week_no: number | null; drive_url: string | null; mime_type: string | null; original_filename: string | null; };
  existing_course_map: Array<{ stable_key: string; title: string; description?: string | null; first_week_no?: number | null; skills?: Array<{ stable_key: string; title: string; kind: string; required_dimensions: string[]; exam_importance: number; prerequisite_importance: number; }>; }>;
  existing_exams?: Array<{ stable_key: string | null; title: string; year_label?: string | null; duration_minutes?: number | null; total_points?: number | null; syllabus_relevance?: number; official?: boolean; active?: boolean; has_solution?: boolean; }>;
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

function ordinarySchema(packet: ProcessingPacket) {
  return {
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
  };
}

function examSchema() {
  return {
    schema_version: "studyos-processing-v1",
    topics: [{
      stable_key: "reuse_existing_topic_or_create_if_needed",
      title: "Topic title",
      skills: [{
        stable_key: "reuse_existing_skill_or_create_if_needed",
        title: "Atomic skill assessed by the paper",
        skill_kind: "problem_solving",
        required_dimensions: ["recognition","execution","exam"],
        exam_importance: 4,
        prerequisite_importance: 3,
        source: { page_start: 1, page_end: 1, relation_type: "tests", confidence: 0.95 },
        questions: []
      }]
    }],
    exam: {
      stable_key: "ws25_26_main",
      title: "Official exam title",
      year_label: "WS25/26",
      exam_at: "optional ISO date only when explicit in source",
      duration_minutes: 90,
      total_points: 90,
      syllabus_relevance: 1,
      notes: "optional factual note",
      questions: [{
        question_no: "1a",
        points: 8,
        prompt: "Faithful full problem text sufficient to solve the question",
        difficulty: 3,
        expected_minutes: 8,
        primary_skill_key: "existing_or_candidate_skill_key",
        skill_keys: ["existing_or_candidate_skill_key"],
        answer_key_or_rubric: null,
        answer_status: "missing",
        source: { page_start: 1, page_end: 1, section_label: "Aufgabe 1a", confidence: 0.98 }
      }]
    }
  };
}

function solutionSchema(packet: ProcessingPacket) {
  return {
    schema_version: "studyos-processing-v1",
    topics: [],
    exam_solution: {
      exam_stable_key: packet.existing_exams?.find((exam) => exam.active !== false)?.stable_key ?? "must_match_existing_exam_key",
      answers: [{
        question_no: "1a",
        answer_key_or_rubric: "Source-grounded marking rubric / official solution essentials",
        source: { page_start: 1, page_end: 1, section_label: "Lösung 1a" }
      }]
    }
  };
}

export function buildProcessingBrief(packet: ProcessingPacket) {
  const existing = JSON.stringify(packet.existing_course_map, null, 2);
  const exams = JSON.stringify(packet.existing_exams ?? [], null, 2);
  const isExam = packet.resource.resource_type === "exam";
  const isSolution = packet.resource.resource_type === "exam_solution";
  const schema = JSON.stringify(isExam ? examSchema() : isSolution ? solutionSchema(packet) : ordinarySchema(packet), null, 2);

  const specialRules = isExam ? [
    "EXAM-SPECIFIC RULES",
    "A. Extract every numbered/sub-numbered past-paper question into top-level exam.questions. Do not duplicate those official prompts inside skill.questions.",
    "B. Transcribe each exam prompt faithfully enough that the question can actually be solved from the stored prompt. Do not invent missing clauses, values, diagrams, or assumptions.",
    "C. Reuse existing skill stable keys whenever possible. If the paper reveals a genuinely missing syllabus skill, create it under the appropriate topic first and reference that key from exam.questions.",
    "D. Preserve printed points and duration exactly when available. Missing points/duration may be omitted; never estimate them from appearance.",
    "E. syllabus_relevance defaults to 1.0. Do not down-weight an exam merely because it is old; relevance is about syllabus compatibility, not age.",
    "F. Only include answer_key_or_rubric when the exam source itself contains an answer/marking scheme. Otherwise use null and answer_status='missing'.",
    "G. answer_status='official' is allowed only when the source explicitly provides an official answer/marking scheme.",
  ] : isSolution ? [
    "EXAM-SOLUTION RULES",
    "A. Match exam_solution.exam_stable_key EXACTLY to one of EXISTING EXAMS below. Never invent or normalize a new key.",
    "B. Output one answer entry per solution question you can source-ground. question_no must match the already-ingested paper.",
    "C. The rubric must come from this solution source. Do not fill gaps with your own derivation.",
    "D. Keep topics empty unless the solution genuinely introduces course material not already represented. The solution's purpose is grading evidence, not taxonomy expansion.",
    "E. StudyOS decides whether the rubric becomes official or unverified from the registered source authority; do not elevate authority in JSON.",
  ] : [];

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
    "4. Default to 1–3 strong generated review questions per skill for ordinary course material. More than 6 usually indicates redundancy.",
    "5. Every generated review question needs an answer_key_or_rubric.",
    "6. Do not award mastery for material merely being explained in the source.",
    "7. For exam-style prompts, do not reveal the theorem/method/algorithm to use unless method selection is not part of the skill.",
    "8. Preserve professor-specific definitions, notation, assumptions, and conventions. Do not silently replace them with generic textbook conventions.",
    "9. If the source is ambiguous, encode lower source confidence rather than inventing certainty.",
    "10. Output JSON only. No markdown fences and no prose before or after it.",
    "",
    ...specialRules,
    ...(specialRules.length ? [""] : []),
    "EXISTING COURSE MAP",
    "Reuse these keys when appropriate:",
    existing,
    "",
    "EXISTING EXAMS",
    "Use these exact stable keys when matching an exam solution:",
    exams,
    "",
    "OUTPUT SCHEMA",
    schema,
  ].join("\n");
}

export function parseCandidateJsonText(text: string) {
  if (!text.trim()) throw new Error("Paste the processor JSON first");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Candidate is not valid JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Candidate must be a JSON object");
  const candidate = value as Record<string, unknown>;
  if (candidate.schema_version !== "studyos-processing-v1") throw new Error("Candidate must use studyos-processing-v1");
  if (!Array.isArray(candidate.topics)) throw new Error("Candidate topics must be an array");
  return candidate;
}
