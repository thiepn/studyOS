import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { handleAssistantRequest } from "@/lib/study/assistant";
import { askStudyLuna } from "@/lib/ai/study-luna";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > 16_000) return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413, headers: { "cache-control": "no-store" } });
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ ok: false, error: "Request body is required." }, { status: 400, headers: { "cache-control": "no-store" } });
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16_000) {
        await reader.cancel();
        return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413, headers: { "cache-control": "no-store" } });
      }
      chunks.push(value);
    }
    const raw = new TextDecoder().decode(Buffer.concat(chunks));
    body = JSON.parse(raw);
  }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON request." }, { status: 400, headers: { "cache-control": "no-store" } }); }

  const result = await handleAssistantRequest(body, {
    enabled: env.studyOsAiEnabled,
    runAssistant: (input) => askStudyLuna(input, {
      baseUrl: process.env.THIEPN_AI_BASE_URL,
      appSecret: process.env.THIEPN_AI_APP_SECRET,
    }),
    getOwner: async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      return error || !data.user || data.user.is_anonymous ? null : data.user.id;
    },
    getCourseContext: async (ownerId, courseId) => {
      const supabase = await createClient();
      const db = supabase as any;
      const { data: course, error: courseError } = await db.from("study_courses")
        .select("id,display_name").eq("id", courseId).eq("user_id", ownerId).eq("active", true).maybeSingle();
      if (courseError) throw courseError;
      if (!course) return null;
      const [skillsResult, questionsResult, resourcesResult] = await Promise.all([
        db.from("study_skills").select("title,description,skill_kind").eq("course_id", courseId).eq("user_id", ownerId).eq("active", true).limit(30),
        db.from("study_questions").select("prompt").eq("course_id", courseId).eq("user_id", ownerId).eq("active", true).limit(20),
        db.from("study_resources").select("title,drive_url").eq("course_id", courseId).eq("user_id", ownerId).eq("active", true).eq("processing_status", "verified").limit(20),
      ]);
      const error = skillsResult.error || questionsResult.error || resourcesResult.error;
      if (error) throw error;
      const skills = (skillsResult.data ?? []).map((item: any) => `- ${item.title} (${item.skill_kind})${item.description ? `: ${item.description}` : ""}`);
      const prompts = (questionsResult.data ?? []).map((item: any) => `- Approved practice prompt: ${item.prompt}`);
      const sources = (resourcesResult.data ?? []).map((item: any) => ({ title: String(item.title), url: typeof item.drive_url === "string" ? item.drive_url : null }));
      return {
        courseName: String(course.display_name),
        context: [...skills, ...prompts, ...sources.map((source: { title: string }) => `- Verified source title: ${source.title}`)].join("\n").slice(0, 8000),
        sources,
      };
    },
  });
  return NextResponse.json(result.body, { status: result.status, headers: { "cache-control": "no-store" } });
}
