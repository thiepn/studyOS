import { NextResponse } from "next/server";
import { parseAttemptInput, recordAttempt } from "@/lib/study/mutations";
import { studyAttemptFailure } from "@/lib/study/attempt-error";

export async function POST(request: Request) {
  try {
    const input = parseAttemptInput(await request.json());
    const data = await recordAttempt(input);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const { status, message } = studyAttemptFailure(error);
    if (status === 500) console.error("[StudyOS attempt] Internal request failure", error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
