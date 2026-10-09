import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { safeStudyReturnPath } from "@/lib/study/auth-return";
import { authLoginUrl } from "@/lib/study/auth-flow";
import { accountOAuthCallback } from "@/lib/study/platform-admission";
import { isQualifiedAppOrigin } from "@/lib/study/origin-qualification";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeStudyReturnPath(requestUrl.searchParams.get("next"));
  // Never generate an OAuth redirect from an untrusted request Host.
  if (!isQualifiedAppOrigin(env.appOrigin, env.deploymentEnv) || requestUrl.origin !== env.appOrigin) {
    return NextResponse.redirect(authLoginUrl(requestUrl.origin, "oauth_origin", next));
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: accountOAuthCallback(env.appOrigin, next) },
    });
    if (error || !data.url) {
      console.error("[StudyOS auth] unable to initiate Google sign-in");
      return NextResponse.redirect(authLoginUrl(env.appOrigin, "oauth_start", next));
    }
    // Supabase supplies the trusted provider URL; no arbitrary return URL is accepted here.
    const response = NextResponse.redirect(data.url);
    response.headers.set("cache-control", "no-store");
    return response;
  } catch {
    console.error("[StudyOS auth] unexpected Google start failure");
    return NextResponse.redirect(authLoginUrl(env.appOrigin, "oauth_start", next));
  }
}
