import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { safeStudyReturnPath } from "@/lib/study/auth-return";
import { authLoginUrl, authenticatedReturnUrl, providerAuthFailure } from "@/lib/study/auth-flow";
import { isQualifiedAppOrigin } from "@/lib/study/origin-qualification";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeStudyReturnPath(url.searchParams.get("next"));
  if (!isQualifiedAppOrigin(env.appOrigin, env.deploymentEnv) || url.origin !== env.appOrigin) {
    return NextResponse.redirect(authLoginUrl(url.origin, "oauth_origin", next));
  }
  // Never echo an arbitrary Google/Supabase error or description back into HTML.
  if (url.searchParams.has("error")) {
    return NextResponse.redirect(authLoginUrl(env.appOrigin, providerAuthFailure(url.searchParams.get("error")), next));
  }
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(authLoginUrl(env.appOrigin, "missing_code", next));

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[StudyOS auth] authorization code exchange failed");
      return NextResponse.redirect(authLoginUrl(env.appOrigin, "oauth_callback", next));
    }
    // A successful code exchange alone must not be treated as a usable session.
    const { data: claims, error: claimError } = await supabase.auth.getClaims();
    if (claimError || !claims?.claims?.sub) {
      console.error("[StudyOS auth] sign-in did not establish verified session claims");
      return NextResponse.redirect(authLoginUrl(env.appOrigin, "session_missing", next));
    }
    return NextResponse.redirect(authenticatedReturnUrl(env.appOrigin, next));
  } catch {
    console.error("[StudyOS auth] unexpected callback error");
    return NextResponse.redirect(authLoginUrl(env.appOrigin, "oauth_callback", next));
  }
}
