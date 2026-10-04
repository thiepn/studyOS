import { NextResponse } from "next/server";
import { resolveReconciliationFinding } from "@/lib/study/workflow";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { note?: unknown; dismiss?: unknown };
    const data = await resolveReconciliationFinding(
      id,
      body.note == null ? undefined : String(body.note).slice(0, 4000),
      body.dismiss === true,
    );
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const status = error instanceof StudyServiceError && error.code.startsWith("invalid_") ? 400 : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status });
  }
}
