import { NextResponse } from "next/server";
import { decideIngestion } from "@/lib/study/resources";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as { action?: unknown; reason?: unknown };
    if (body.action !== "accept" && body.action !== "reject") return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    const data = await decideIngestion(id, body.action, body.reason == null ? undefined : String(body.reason));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
