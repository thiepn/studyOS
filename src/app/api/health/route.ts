import { NextResponse } from "next/server";
import packageInfo from "../../../../package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      app: "studyOS",
      version: packageInfo.version,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      timestamp: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
