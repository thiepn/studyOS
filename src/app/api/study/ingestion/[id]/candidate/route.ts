import { NextResponse } from "next/server";
import { parseCandidateInput, submitIngestionCandidate } from "@/lib/study/resources";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await submitIngestionCandidate(id, parseCandidateInput(await request.json()));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const status = error instanceof StudyServiceError && error.code === "invalid_candidate" ? 400 : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status });
  }
}
