import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudyWorkspaceState } from "@/lib/study/bootstrap";
import { StudyAssistant } from "@/components/study-assistant";
import {env} from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const state = await getStudyWorkspaceState(supabase);
  let courses: { id: string; name: string }[] = [];
  if (state.activeSemester) {
    const { data } = await supabase.from("study_courses").select("id,display_name")
      .eq("user_id", state.userId).eq("semester_id", state.activeSemester.id).eq("active", true).order("sort_order");
    courses = (data ?? []).map((course) => ({ id: course.id, name: course.display_name }));
  }
  return <main className="shell study-assistant-page">
    <header className="header"><div><p className="eyebrow">StudyOS / Study tools</p><h1>GPT-6 Luna</h1><p className="muted">Your course-aware AI tutor for explanations, guided proofs, hints and self-tests. Luna does not change course records or award mastery.</p></div><Link className="secondary-button" href="/more">More tools</Link></header>
    <StudyAssistant courses={courses} initialCourseId={query.course} enabled={env.studyOsAiEnabled} />
  </main>;
}
