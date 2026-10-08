import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { safeStudyReturnPath } from "@/lib/study/auth-return";
import { isQualifiedAppOrigin } from "@/lib/study/origin-qualification";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeStudyReturnPath(url.searchParams.get("next"));
  if(!isQualifiedAppOrigin(env.appOrigin,env.deploymentEnv)||url.origin!==env.appOrigin){
    return NextResponse.redirect(new URL("/login?error=oauth_origin",url.origin));
  }
  if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", env.appOrigin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=oauth_callback", env.appOrigin));
  return NextResponse.redirect(new URL(next, env.appOrigin));
}
