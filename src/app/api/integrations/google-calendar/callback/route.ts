import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeCalendarCode, fetchCalendarGoogleIdentity } from "@/lib/google-calendar/oauth";
import { saveCalendarConnection } from "@/lib/google-calendar/connection";
import { syncStudyCalendar } from "@/lib/google-calendar/sync";
import { ensureStudyWorkspace } from "@/lib/study/bootstrap";
import { env } from "@/lib/env";

export async function GET(request:NextRequest){
  const url=new URL(request.url); const code=url.searchParams.get("code"),state=url.searchParams.get("state"),oauthError=url.searchParams.get("error");
  const store=await cookies(); const expectedState=store.get("study_calendar_oauth_state")?.value,verifier=store.get("study_calendar_pkce")?.value;
  store.delete("study_calendar_oauth_state");store.delete("study_calendar_pkce");
  if(oauthError||!code||!state||!expectedState||state!==expectedState||!verifier)return NextResponse.redirect(env.appOrigin+"/?calendar=oauth_error");
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const userId=data?.claims?.sub?String(data.claims.sub):null;
  if(!userId)return NextResponse.redirect(env.appOrigin+"/login");
  await ensureStudyWorkspace(supabase);
  try{
    const tokens=await exchangeCalendarCode(code,verifier); const identity=await fetchCalendarGoogleIdentity(tokens.access_token);
    if(!tokens.refresh_token)return NextResponse.redirect(env.appOrigin+"/?calendar=no_refresh_token");
    await saveCalendarConnection({userId,googleSub:identity.sub,email:identity.email,scopes:(tokens.scope??"").split(/\s+/).filter(Boolean),refreshToken:tokens.refresh_token,accessToken:tokens.access_token});
    await syncStudyCalendar(userId);
    return NextResponse.redirect(env.appOrigin+"/?calendar=connected");
  }catch{return NextResponse.redirect(env.appOrigin+"/?calendar=setup_error");}
}
