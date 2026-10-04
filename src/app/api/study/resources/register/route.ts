import { NextResponse } from "next/server";
import { parseResourceRegistration, registerResource } from "@/lib/study/resources";
import { StudyServiceError } from "@/lib/study/errors";

export async function POST(request: Request) {
  try {
    const data = await registerResource(parseResourceRegistration(await request.json()));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const status = error instanceof StudyServiceError && error.code === "invalid_resource" ? 400 : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status });
  }
}
