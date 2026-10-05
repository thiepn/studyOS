import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { calendarAuthorizationUrl, createCalendarOAuthState } from "@/lib/google-calendar/oauth";
import { env } from "@/lib/env";

export async function GET(){
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims();
  if(!data?.claims?.sub)return NextResponse.redirect(new URL("/login",env.appOrigin));
  const {state,verifier,challenge}=createCalendarOAuthState(); const store=await cookies();
  const options={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:600};
  store.set("study_calendar_oauth_state",state,options); store.set("study_calendar_pkce",verifier,options);
  return NextResponse.redirect(calendarAuthorizationUrl(state,challenge));
}
