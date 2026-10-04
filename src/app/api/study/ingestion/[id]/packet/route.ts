import { NextResponse } from "next/server";
import { getProcessingPacket } from "@/lib/study/processing";
import { StudyServiceError } from "@/lib/study/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await getProcessingPacket(id);
    return NextResponse.json({ ok: true, data }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const status = error instanceof StudyServiceError && error.code.startsWith("invalid_") ? 400 : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status });
  }
}