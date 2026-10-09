import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, fetchDriveAccountIdentity } from "@/lib/google-drive/oauth";
import { hasGrantedDriveFileScope } from "@/lib/google-drive/scope-validation";
import { markDriveSetupFailed, saveDriveConnection } from "@/lib/google-drive/connection";
import { ensureStudyWorkspace } from "@/lib/study/bootstrap";
import { createSemesterDriveTree } from "@/lib/google-drive/setup";
import { env } from "@/lib/env";
import { isQualifiedAppOrigin } from "@/lib/study/origin-qualification";
import { ConnectionSwitchError } from "@/lib/study/connection-recovery";

function finish(reason: string) {
  return NextResponse.redirect(env.appOrigin + "/resources?drive=" + reason);
}

/** All failures return to a safe page instead of stranding users on a 500
 * with a now-consumed single-use Google authorization code. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if(!isQualifiedAppOrigin(env.appOrigin,env.deploymentEnv)||url.origin!==env.appOrigin)
    return NextResponse.redirect(new URL("/login?error=oauth_origin",url.origin));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const store = await cookies();
  const expectedState = store.get("study_drive_oauth_state")?.value;
  const verifier = store.get("study_drive_pkce")?.value;
  const switchIntent = store.get("study_drive_switch_intent")?.value;
  store.delete("study_drive_switch_intent");
  store.delete("study_drive_oauth_state");
  store.delete("study_drive_pkce");

  if (error) return finish(error === "access_denied" ? "permission_denied" : "oauth_error");
  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return finish("oauth_error");
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub ? String(data.claims.sub) : null;
    if (!userId) return NextResponse.redirect(env.appOrigin + "/login");

    await ensureStudyWorkspace(supabase);
    const tokens = await exchangeCode(code, verifier);

    // Granular consent permits identity-only grants even when drive.file
    // was requested. Fail BEFORE writing refresh tokens or a connected row.
    if (!hasGrantedDriveFileScope(tokens.scope)) {
      console.warn("[Study Drive OAuth] Google consent completed without Drive file permission.");
      return finish("permission_required");
    }
    if (!tokens.refresh_token) return finish("no_refresh_token");

    const identity = await fetchDriveAccountIdentity(tokens.access_token);
    await saveDriveConnection({
      userId, googleSub: identity.sub, email: identity.email,
      scopes: (tokens.scope ?? "").split(/\s+/).filter(Boolean), refreshToken: tokens.refresh_token,
      approvedSwitch: switchIntent === userId,
    });

    try {
      await createSemesterDriveTree(userId, tokens.access_token);
    } catch (setupError) {
      console.error("[Study Drive OAuth] folder setup:", setupError instanceof Error ? setupError.message : "unknown");
      try { await markDriveSetupFailed(userId); }
      catch (statusError) { console.error("[Study Drive OAuth] setup status:", statusError instanceof Error ? statusError.message : "unknown"); }
      return finish("setup_failed");
    }
    return finish("connected");
  } catch (callbackError) {
    if (callbackError instanceof ConnectionSwitchError) {
      return NextResponse.redirect(new URL("/account?notice=drive_confirmation_required", env.appOrigin));
    }
    console.error("[Study Drive OAuth] callback:", callbackError instanceof Error ? callbackError.message : "unknown");
    return finish("callback_failed");
  }
}
