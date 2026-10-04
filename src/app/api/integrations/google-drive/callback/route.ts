import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, fetchGoogleIdentity } from "@/lib/google-drive/oauth";
import { saveDriveConnection } from "@/lib/google-drive/connection";
import { ensureStudyWorkspace } from "@/lib/study/bootstrap";
import { createSemesterDriveTree } from "@/lib/google-drive/setup";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const store = await cookies();
  const expectedState = store.get("study_drive_oauth_state")?.value;
  const verifier = store.get("study_drive_pkce")?.value;
  store.delete("study_drive_oauth_state"); store.delete("study_drive_pkce");
  if (error || !code || !state || !expectedState || state !== expectedState || !verifier) {
    return NextResponse.redirect(`${env.appOrigin}/resources?drive=oauth_error`);
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ? String(data.claims.sub) : undefined;
  if (!userId) return NextResponse.redirect(`${env.appOrigin}/login`);
  await ensureStudyWorkspace(supabase);
  const tokens = await exchangeCode(code, verifier);
  const identity = await fetchGoogleIdentity(tokens.access_token);
  if (!tokens.refresh_token) return NextResponse.redirect(`${env.appOrigin}/resources?drive=no_refresh_token`);
  await saveDriveConnection({ userId, googleSub: identity.sub, email: identity.email, scopes: (tokens.scope ?? "").split(/\s+/).filter(Boolean), refreshToken: tokens.refresh_token });
  await createSemesterDriveTree(userId, tokens.access_token);
  return NextResponse.redirect(`${env.appOrigin}/resources?drive=connected`);
}
