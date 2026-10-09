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
    if (status === 500) console.error("[StudyOS attempt] Internal request failure", error);
    const message = status === 500 ? "Could not save study attempt." :
      error instanceof Error ? error.message : "Invalid study attempt.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
