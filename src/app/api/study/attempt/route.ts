import { NextResponse } from "next/server";
import { parseAttemptInput, recordAttempt } from "@/lib/study/mutations";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request: Request) {
  try {
    const input = parseAttemptInput(await request.json());
    const data = await recordAttempt(input);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const code = error instanceof StudyServiceError ? error.code : "unknown";
    const status = code === "invalid_attempt" ? 400 : code === "not_authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status });
  }
}
