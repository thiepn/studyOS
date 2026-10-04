export type WeekNextAction =
  | "await_material"
  | "process_material"
  | "retrieve_lecture"
  | "attempt_exercise"
  | "await_exercise"
  | "reconcile_solution"
  | "await_solution"
  | "repair_findings"
  | "weekly_checkpoint"
  | "maintain";

export type WeekMilestone =
  | "lecture_retrieval"
  | "exercise_attempt"
  | "solution_reconcile"
  | "weekly_checkpoint";

const LABELS: Record<WeekNextAction, string> = {
  await_material: "Await course material",
  process_material: "Process new material",
  retrieve_lecture: "Retrieve lecture from memory",
  attempt_exercise: "Attempt exercise sheet",
  await_exercise: "Await exercise sheet",
  reconcile_solution: "Reconcile with solution",
  await_solution: "Await official solution",
  repair_findings: "Repair solution findings",
  weekly_checkpoint: "Run weekly checkpoint",
  maintain: "Week retained",
};

export function actionLabel(action: string) {
  return LABELS[action as WeekNextAction] ?? action.replaceAll("_", " ");
}

export function milestoneForAction(action: string): WeekMilestone | null {
  if (action === "retrieve_lecture") return "lecture_retrieval";
  if (action === "attempt_exercise") return "exercise_attempt";
  if (action === "reconcile_solution") return "solution_reconcile";
  if (action === "weekly_checkpoint") return "weekly_checkpoint";
  return null;
}

export function actionDescription(action: string) {
  switch (action as WeekNextAction) {
    case "retrieve_lecture":
      return "Close the notes and reconstruct the main definitions, results, methods, and one representative example. Then mark retrieval complete.";
    case "attempt_exercise":
      return "Solve the released sheet before opening the official solution. Record completion only after a genuine independent attempt.";
    case "reconcile_solution":
      return "Compare your work against the official solution. Record every meaningful conceptual, method-selection, execution, or calculation discrepancy.";
    case "repair_findings":
      return "Re-solve mapped weak points independently. Mapped findings are already scheduled into the review engine.";
    case "weekly_checkpoint":
      return "Run a short mixed review from the week and earlier material, then mark the checkpoint complete.";
    case "process_material":
      return "Finish extraction/approval for the newly released source before studying from generated material.";
    case "await_exercise":
      return "Lecture retrieval is current. No exercise sheet has been released yet.";
    case "await_solution":
      return "Your independent exercise attempt is recorded. Do not inspect a solution until it is officially released.";
    case "await_material":
      return "Nothing has been released for this teaching week yet.";
    default:
      return "No catch-up action is currently required. Continue scheduled reviews.";
  }
}
