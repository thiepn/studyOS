import type { StudyAttemptResult, StudyErrorType, StudyIndependence } from "@/lib/supabase/database.types";

export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESULTS = new Set(["correct", "partial", "incorrect"]);
const INDEPENDENCE = new Set(["independent", "hint_1", "hint_2", "solution_exposed"]);
const ERRORS = new Set(["concept","recall","recognition","method_selection","execution","proof_structure","calculation","misreading","time_management","programming_bug"]);

export type DraftOutcome = {
  questionId: string; result?: StudyAttemptResult; independence?: StudyIndependence;
  queued?: boolean; durationSeconds?: number; skipped?: boolean;
};

export type StudyDraft = {
  version: 1;
  fingerprint: string;
  savedAt: string;
  sessionId: string;
  sessionStartedAt: string;
  questionStartedAt: string;
  questionId: string;
  index: number;
  phase: "answering" | "grading" | "submitting";
  requestId: string;
  answerSurface: "typed" | "paper";
  workingText: string;
  responseText: string;
  confidence: number | null;
  independence: StudyIndependence;
  hint1Visible: boolean; hint2Visible: boolean;
  result: StudyAttemptResult | null;
  verifiedExternally: boolean;
  errorTypes: StudyErrorType[];
  lockedDuration: number;
  activeSeconds: number;
  outcomes: DraftOutcome[];
};

/** The hash is a cache identity, not a security token. Include all rubric/prompt
 * content to prevent reviving a solved draft against a revised question. */
export function studyQueueFingerprint(
  sessionType: string, courseId: string | undefined,
  questions: readonly { id: string; prompt: string; answer_key_or_rubric: string | null }[],
): string {
  const source=JSON.stringify([sessionType,courseId??"",questions.map(q=>[q.id,q.prompt,q.answer_key_or_rubric])]);
  let hash=2166136261;
  for(let i=0;i<source.length;i++){
    hash^=source.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0).toString(36)+"-"+questions.length;
}

export function studyDraftStorageKey(fingerprint: string): string {
  return `studyos:local-session-draft:v1:${fingerprint}`;
}

const validDate=(v:unknown)=>typeof v==="string" && Number.isFinite(Date.parse(v));
const validConfidence=(v:unknown)=>v===null || (Number.isInteger(v)&&Number(v)>=1&&Number(v)<=5);

/** Invalid/corrupted browser drafts fail closed; a revealed rubric must never be
 * restored into the editable pre-reveal phase. */
export function parseStudyDraft(
  raw: string | null,
  fingerprint: string,
  questionIds: readonly string[],
  now=Date.now(),
): StudyDraft | null {
  if(!raw || raw.length>100000) return null;
  let input:unknown;
  try{input=JSON.parse(raw);}catch{return null;}
  if(!input || typeof input!=="object" || Array.isArray(input))return null;
  const d=input as Record<string,unknown>;
  if(d.version!==1||d.fingerprint!==fingerprint||!validDate(d.savedAt)
    || Math.abs(now-Date.parse(String(d.savedAt)))>DRAFT_TTL_MS
    || !UUID.test(String(d.sessionId??""))||!UUID.test(String(d.requestId??""))
    || !validDate(d.sessionStartedAt)||!validDate(d.questionStartedAt))return null;
  if(!Number.isInteger(d.index)||Number(d.index)<0||Number(d.index)>=questionIds.length
    ||d.questionId!==questionIds[Number(d.index)])return null;
  if(!["answering","grading","submitting"].includes(String(d.phase))
    ||!["typed","paper"].includes(String(d.answerSurface))
    ||typeof d.workingText!=="string"||d.workingText.length>17000
    ||typeof d.responseText!=="string"||d.responseText.length>2500
    ||!validConfidence(d.confidence)
    ||!INDEPENDENCE.has(String(d.independence))
    ||typeof d.hint1Visible!=="boolean"||typeof d.hint2Visible!=="boolean"
    ||(d.result!==null&&!RESULTS.has(String(d.result)))
    ||typeof d.verifiedExternally!=="boolean"
    ||!Array.isArray(d.errorTypes)||d.errorTypes.some(x=>!ERRORS.has(String(x)))
    ||!Number.isInteger(d.lockedDuration)||Number(d.lockedDuration)<0
    ||!Number.isInteger(d.activeSeconds)||Number(d.activeSeconds)<0||Number(d.activeSeconds)>43200
    ||!Array.isArray(d.outcomes)||d.outcomes.length>questionIds.length)return null;
  if(d.phase!=="answering" && d.confidence===null)return null;
  if(d.phase==="answering" && (d.independence==="solution_exposed"||d.result!==null))return null;
  const outcomes:DraftOutcome[]=[];
  for(let i=0;i<d.outcomes.length;i++){
    const row=d.outcomes[i];
    if(!row||typeof row!=="object"||Array.isArray(row))return null;
    const o=row as Record<string,unknown>;
    if(o.questionId!==questionIds[i] || (o.result!==undefined&&!RESULTS.has(String(o.result)))
      ||(o.independence!==undefined&&!INDEPENDENCE.has(String(o.independence)))
      ||(o.queued!==undefined&&typeof o.queued!=="boolean")
      ||(o.skipped!==undefined&&typeof o.skipped!=="boolean")
      ||(o.durationSeconds!==undefined&&(!Number.isFinite(o.durationSeconds)||Number(o.durationSeconds)<0)))return null;
    outcomes.push({questionId:String(o.questionId),result:o.result as StudyAttemptResult|undefined,
      independence:o.independence as StudyIndependence|undefined,queued:o.queued as boolean|undefined,
      skipped:o.skipped as boolean|undefined,durationSeconds:o.durationSeconds as number|undefined});
  }
  if(outcomes.length!==d.index)return null;
  return {...d,phase:d.phase==="submitting"?"grading":d.phase,outcomes} as StudyDraft;
}
