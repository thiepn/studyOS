export type PlanningMode = "normal" | "light" | "recovery" | "intensive" | "custom";
export type PlanningCandidateKind = "review" | "commitment" | "workflow" | "checkpoint" | "exam_strategy" | "drift_repair";

export type PlanningCandidate = {
  id: string;
  kind: PlanningCandidateKind;
  courseId?: string | null;
  courseName?: string | null;
  title: string;
  reason: string;
  href: string;
  estimatedMinutes: number;
  priority: number;
  urgent?: boolean;
  heavy?: boolean;
  splittable?: boolean;
  allowedInRecovery?: boolean;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type PlannedItem = PlanningCandidate & {
  scheduledMinutes: number;
  partial: boolean;
};

export type DailyPlan = {
  mode: PlanningMode;
  budgetMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  selected: PlannedItem[];
  deferred: PlanningCandidate[];
};

export function buildDailyPlan(
  candidates: PlanningCandidate[],
  input: { mode: PlanningMode; budgetMinutes: number; maxFocusItems: number },
): DailyPlan {
  const budgetMinutes = Math.max(0, Math.floor(input.budgetMinutes));
  const maxFocusItems = Math.max(0, Math.floor(input.maxFocusItems));
  const selected: PlannedItem[] = [];
  const remaining = new Map(candidates.map((candidate) => [candidate.id, { ...candidate }]));
  let usedMinutes = 0;

  const add = (candidate: PlanningCandidate, minutes: number) => {
    const scheduledMinutes = Math.max(1, Math.floor(minutes));
    selected.push({ ...candidate, scheduledMinutes, partial: scheduledMinutes < candidate.estimatedMinutes });
    usedMinutes += scheduledMinutes;
    remaining.delete(candidate.id);
  };

  const review = [...remaining.values()]
    .filter((candidate) => candidate.kind === "review" && candidate.estimatedMinutes > 0)
    .sort((a, b) => b.priority - a.priority)[0];

  if (review && budgetMinutes > 0) {
    const minutes = Math.min(review.estimatedMinutes, budgetMinutes);
    if (minutes > 0) add(review, minutes);
  }

  const courseCounts = new Map<string, number>();
  let focusCount = 0;

  while (focusCount < maxFocusItems && usedMinutes < budgetMinutes) {
    const free = budgetMinutes - usedMinutes;
    const pool = [...remaining.values()].filter((candidate) => {
      if (candidate.kind === "review" || candidate.estimatedMinutes <= 0) return false;
      if (input.mode === "recovery" && !candidate.urgent) {
        if (candidate.heavy || candidate.allowedInRecovery === false) return false;
      }
      if (candidate.estimatedMinutes <= free) return true;
      return Boolean(candidate.splittable && free >= Math.min(15, candidate.estimatedMinutes));
    });
    if (!pool.length) break;

    pool.sort((a, b) => {
      const aPenalty = a.courseId ? (courseCounts.get(a.courseId) ?? 0) * 12 : 0;
      const bPenalty = b.courseId ? (courseCounts.get(b.courseId) ?? 0) * 12 : 0;
      const aScore = a.priority + (a.urgent ? 25 : 0) - aPenalty;
      const bScore = b.priority + (b.urgent ? 25 : 0) - bPenalty;
      if (bScore !== aScore) return bScore - aScore;
      if (Number(Boolean(b.urgent)) !== Number(Boolean(a.urgent))) return Number(Boolean(b.urgent)) - Number(Boolean(a.urgent));
      return a.estimatedMinutes - b.estimatedMinutes || a.id.localeCompare(b.id);
    });

    const candidate = pool[0];
    const minutes = candidate.estimatedMinutes <= free ? candidate.estimatedMinutes : free;
    add(candidate, minutes);
    focusCount += 1;
    if (candidate.courseId) courseCounts.set(candidate.courseId, (courseCounts.get(candidate.courseId) ?? 0) + 1);
  }

  return {
    mode: input.mode,
    budgetMinutes,
    usedMinutes,
    remainingMinutes: Math.max(0, budgetMinutes - usedMinutes),
    selected,
    deferred: [...remaining.values()].sort((a, b) => (b.priority + (b.urgent ? 25 : 0)) - (a.priority + (a.urgent ? 25 : 0))),
  };
}

export function deadlinePressure(dueAt: string, now = new Date()) {
  const ms = Date.parse(dueAt) - now.getTime();
  const hours = ms / 3_600_000;
  if (hours <= 0) return { score: 45, urgent: true, label: "overdue" };
  if (hours <= 24) return { score: 40, urgent: true, label: "due within 24h" };
  if (hours <= 48) return { score: 34, urgent: true, label: "due within 48h" };
  if (hours <= 72) return { score: 28, urgent: false, label: "due within 3 days" };
  if (hours <= 168) return { score: 18, urgent: false, label: "due this week" };
  if (hours <= 336) return { score: 8, urgent: false, label: "due within 2 weeks" };
  return { score: 0, urgent: false, label: "upcoming" };
}
