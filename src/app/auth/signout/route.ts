import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { isQualifiedAppOrigin } from "@/lib/study/origin-qualification";
import { authLoginUrl, validAuthSubmission } from "@/lib/study/auth-flow";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!isQualifiedAppOrigin(env.appOrigin, env.deploymentEnv)
      || !validAuthSubmission(env.appOrigin, url.origin, request.headers.get("origin"))) {
    return NextResponse.json({ ok: false, error: "Invalid sign-out origin" }, {
      status: 403, headers: { "cache-control": "no-store" },
    });
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.error("[StudyOS auth] sign-out failed");
      return NextResponse.redirect(authLoginUrl(env.appOrigin, "signout_failed", null), 303);
    }
    return NextResponse.redirect(new URL("/login?status=signed_out", env.appOrigin), 303);
  } catch {
    console.error("[StudyOS auth] unexpected sign-out failure");
    return NextResponse.redirect(authLoginUrl(env.appOrigin, "signout_failed", null), 303);
  }
}
