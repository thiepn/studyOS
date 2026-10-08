import type { StudyAttemptResult, StudyErrorType, StudyIndependence } from "@/lib/supabase/database.types";

const HELP_RANK: Record<StudyIndependence, number> = { independent: 0, hint_1: 1, hint_2: 2, solution_exposed: 3 };

export function escalateIndependence(current: StudyIndependence, next: StudyIndependence): StudyIndependence {
  return HELP_RANK[next] > HELP_RANK[current] ? next : current;
}

export function isMasteryCreditable(independence: StudyIndependence) { return independence !== "solution_exposed"; }

/** Confidence is an answer-time judgment, never chosen after seeing the rubric.
 * Typed work needs a written attempt; paper solving is explicitly supported.
 * Giving up still requires a pre-reveal confidence decision. */
export function canRevealRubric(
  confidence: number | null,
  surface: "typed" | "paper",
  response: string,
  gaveUp = false,
): boolean {
  return confidence != null && Number.isInteger(confidence) && confidence >= 1 && confidence <= 5
    && (gaveUp || surface === "paper" || response.trim().length > 0);
}

export function assessmentReady(result: StudyAttemptResult | null, confidence: number | null, errorTypes: StudyErrorType[]) {
  if (!result || confidence == null || confidence < 1 || confidence > 5) return false;
  if (result === "correct") return true;
  return errorTypes.length > 0;
}

/** No positive self-grade without a rubric or explicit external verification.
 * A give-up is already zero-credit and needs no solution verification. */
export function assessmentSourceVerified(
  hasRubric: boolean,
  verifiedExternally: boolean,
  independence: StudyIndependence,
): boolean {
  return hasRubric || verifiedExternally || independence === "solution_exposed";
}

export function resultLabel(result: StudyAttemptResult) {
  if (result === "correct") return "Correct";
  if (result === "partial") return "Partly correct";
  return "Incorrect";
}
