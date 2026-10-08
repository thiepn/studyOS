import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { safeStudyReturnPath } from "@/lib/study/auth-return";
import { accountOAuthCallback } from "@/lib/study/platform-admission";
import { isQualifiedAppOrigin } from "@/lib/study/origin-qualification";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeStudyReturnPath(requestUrl.searchParams.get("next"));
  // OAuth must use the configured canonical host. An untrusted Host
  // header must never become an allowlisted callback destination.
  if(!isQualifiedAppOrigin(env.appOrigin,env.deploymentEnv)
    ||requestUrl.origin!==env.appOrigin){
    return NextResponse.redirect(new URL("/login?error=oauth_origin",requestUrl.origin));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: accountOAuthCallback(env.appOrigin,next),
    },
  });
  if (error || !data.url) return NextResponse.redirect(new URL(`/login?error=oauth_start&next=${encodeURIComponent(next)}`, requestUrl.origin));
  return NextResponse.redirect(data.url);
}
