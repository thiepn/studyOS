import type { StudyResourceType } from "@/lib/supabase/database.types";

export type CourseAlias = { stableKey: string; displayName: string };
export type DriveClassification = {
  courseStableKey?: string;
  resourceType?: StudyResourceType;
  weekNo?: number;
  confidence: number;
  reasons: string[];
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function classifyDriveFile(name: string, courses: CourseAlias[], context?: { courseStableKey?: string; folderKind?: string; weekNo?: number }): DriveClassification {
  const n = normalize(name);
  const reasons: string[] = [];
  let resourceType: StudyResourceType | undefined;
  let confidence = 0.35;
  const typeRules: Array<[RegExp, StudyResourceType, number, string]> = [
    [/(muster losung|musterlosung|musterloesung|solution|solutions|answer key|losung|loesung)/, "solution", .92, "solution filename"],
    [/(alt klausur|altklausur|exam|klausur|probeklausur)/, "exam", .90, "exam filename"],
    [/(ubungsblatt|uebungsblatt|exercise sheet|problem set|blatt)/, "exercise", .84, "exercise filename"],
    [/(vorlesung|lecture|folien|slides|^vl\b)/, "lecture", .80, "lecture filename"],
    [/(skript|script)/, "script", .82, "script filename"],
    [/(reference|referenz|book|textbook)/, "reference", .72, "reference filename"],
  ];
  const contextualType: Record<string, StudyResourceType | undefined> = {
    course: "course_info", exams: "exam", script: "script", reference: "reference",
  };
  if (context?.folderKind && contextualType[context.folderKind]) {
    resourceType = contextualType[context.folderKind]; confidence = .96; reasons.push(`folder ${context.folderKind}`);
  } else {
    for (const [pattern, type, score, reason] of typeRules) if (pattern.test(n)) { resourceType = type; confidence = Math.max(confidence, score); reasons.push(reason); break; }
  }

  let weekNo = context?.weekNo;
  if (weekNo) { confidence = Math.max(confidence, .97); reasons.push("week folder"); }
  if (!weekNo) {
    const match = n.match(/(?:^|\s)(?:w|week|woche)\s*0?(\d{1,2})(?:\s|$)/) ?? n.match(/(?:blatt|sheet)\s*0?(\d{1,2})/);
    if (match) { const parsed = Number(match[1]); if (parsed >= 1 && parsed <= 40) { weekNo = parsed; confidence = Math.max(confidence, .67); reasons.push("week-like filename number"); } }
  }

  let courseStableKey = context?.courseStableKey;
  if (courseStableKey) { confidence = Math.max(confidence, .98); reasons.push("course folder"); }
  if (!courseStableKey) {
    const candidates = courses.map((course) => ({ course, tokens: normalize(course.displayName).split(" ").filter((x) => x.length >= 3) }))
      .filter(({ tokens }) => tokens.length && tokens.every((token) => n.includes(token)));
    if (candidates.length === 1) { courseStableKey = candidates[0].course.stableKey; confidence = Math.max(confidence, .74); reasons.push("course name in filename"); }
  }

  if (!reasons.length) reasons.push("unclassified filename");
  return { courseStableKey, resourceType, weekNo, confidence: Number(confidence.toFixed(3)), reasons };
}
