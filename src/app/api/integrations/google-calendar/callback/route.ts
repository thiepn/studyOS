import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeCalendarCode, fetchCalendarGoogleIdentity } from "@/lib/google-calendar/oauth";
import { hasRequiredCalendarScopes } from "@/lib/google-calendar/scope-validation";
import { saveCalendarConnection } from "@/lib/google-calendar/connection";
import { syncStudyCalendar } from "@/lib/google-calendar/sync";
import { ensureStudyWorkspace } from "@/lib/study/bootstrap";
import { env } from "@/lib/env";

function finish(reason:string){return NextResponse.redirect(env.appOrigin+"/setup/platform?calendar="+reason);}

export async function GET(request:NextRequest){
  const url=new URL(request.url);
  const code=url.searchParams.get("code"),state=url.searchParams.get("state"),oauthError=url.searchParams.get("error");
  const store=await cookies();
  const expectedState=store.get("study_calendar_oauth_state")?.value;
  const verifier=store.get("study_calendar_pkce")?.value;
  store.delete("study_calendar_oauth_state");store.delete("study_calendar_pkce");
  if(oauthError)return finish(oauthError==="access_denied"?"permission_denied":"oauth_error");
  if(!code||!state||!expectedState||state!==expectedState||!verifier)return finish("oauth_error");
  try{
    const supabase=await createClient(),{data}=await supabase.auth.getClaims();
    const userId=data?.claims?.sub?String(data.claims.sub):null;
    if(!userId)return NextResponse.redirect(env.appOrigin+"/login");
    await ensureStudyWorkspace(supabase);
    const tokens=await exchangeCalendarCode(code,verifier);
    if(!hasRequiredCalendarScopes(tokens.scope))return finish("permission_required");
    if(!tokens.refresh_token)return finish("no_refresh_token");
    const identity=await fetchCalendarGoogleIdentity(tokens.access_token);
    await saveCalendarConnection({
      userId,googleSub:identity.sub,email:identity.email,
      scopes:(tokens.scope??"").split(/\s+/).filter(Boolean),
      refreshToken:tokens.refresh_token,accessToken:tokens.access_token,
    });
    try{await syncStudyCalendar(userId);}
    catch(e){
      console.error("[Study Calendar] first sync failed:",e instanceof Error?e.message:"unknown");
      return finish("sync_failed");
    }
    return finish("connected");
  }catch(e){
    console.error("[Study Calendar] callback failed:",e instanceof Error?e.message:"unknown");
    return finish("setup_error");
  }
}
