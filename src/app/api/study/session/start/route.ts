import { NextResponse } from "next/server";
import { parseSessionStart, startReviewSession } from "@/lib/study/sessions";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request: Request) {
  try {
    const data = await startReviewSession(parseSessionStart(await request.json()));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const status = error instanceof StudyServiceError && error.code === "invalid_session" ? 400 : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status });
  }
}
