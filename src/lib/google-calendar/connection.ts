import { createAdminClient } from "@/lib/supabase/admin";
import { encryptCalendarRefreshToken } from "./crypto";
import { listGoogleCalendars } from "./client";
import { hasRequiredCalendarScopes } from "./scope-validation";

export async function saveCalendarConnection(input:{userId:string;googleSub:string;email?:string;scopes:string[];refreshToken:string;accessToken:string}) {
  if(!hasRequiredCalendarScopes(input.scopes))throw new Error("Required Calendar scopes not granted.");
  // Fail before persisting any credentials on insufficient scopes or access.
  const calendars=await listGoogleCalendars(input.accessToken);
  // calendar.events.owned allows edits only on calendars the user owns.
  const writable=calendars.find(c=>c.primary&&c.accessRole==="owner")
    ??calendars.find(c=>c.accessRole==="owner");
  if(!writable)throw new Error("No owned Google Calendar is available for StudyOS event creation.");
  const admin=createAdminClient(),now=new Date().toISOString();
  const {data:previous,error:previousError}=await admin.from("study_calendar_connections")
    .select("google_account_sub").eq("user_id",input.userId).maybeSingle();
  if(previousError)throw new Error("Could not inspect existing Calendar connection");
  const switched=Boolean(previous?.google_account_sub&&previous.google_account_sub!==input.googleSub);
  const {error:credError}=await admin.from("study_calendar_credentials").upsert({
    user_id:input.userId,encrypted_refresh_token:encryptCalendarRefreshToken(input.refreshToken),
    encryption_version:1,updated_at:now,
  },{onConflict:"user_id"});
  if(credError)throw new Error("Could not store Calendar credential");
  if(switched){
    const {error:e}=await admin.from("study_calendar_events").delete().eq("user_id",input.userId);
    if(e)throw new Error("Could not clear previous Calendar events");
    const {error:s}=await admin.from("study_calendar_sources").delete().eq("user_id",input.userId);
    if(s)throw new Error("Could not clear previous Calendar sources");
  }
  const rows=calendars.map(c=>({
    user_id:input.userId,calendar_id:c.id,summary:c.summary,access_role:c.accessRole??null,
    is_primary:Boolean(c.primary),selected:Boolean(c.primary),
    writable:c.accessRole==="owner",
    timezone:c.timeZone??null,background_color:c.backgroundColor??null,
    last_seen_at:now,updated_at:now,
  }));
  if(rows.length){
    const {error}=await admin.from("study_calendar_sources").upsert(rows,{onConflict:"user_id,calendar_id"});
    if(error)throw new Error("Could not store Calendar list");
  }
  const primary=calendars.find(c=>c.primary);
  const {error:connError}=await admin.from("study_calendar_connections").upsert({
    user_id:input.userId,google_account_sub:input.googleSub,google_account_email:input.email??null,
    scopes:input.scopes,status:"connected",write_calendar_id:writable.id,
    timezone:primary?.timeZone??writable.timeZone??"Europe/Berlin",connected_at:now,
    last_error:null,updated_at:now,
    ...(switched?{last_sync_at:null,last_sync_status:null}:{}),
  },{onConflict:"user_id"});
  if(connError)throw new Error("Could not store Calendar connection");
}

export async function disconnectCalendar(userId:string){
  const admin=createAdminClient();
  const {error:c}=await admin.from("study_calendar_credentials").delete().eq("user_id",userId);
  if(c)throw new Error("Could not remove Calendar credentials");
  const {error:e}=await admin.from("study_calendar_events").delete().eq("user_id",userId);
  if(e)throw new Error("Could not clear Calendar events");
  const {error:s}=await admin.from("study_calendar_sources").delete().eq("user_id",userId);
  if(s)throw new Error("Could not clear Calendar sources");
  const {error}=await admin.from("study_calendar_connections").update({
    status:"disconnected",google_account_sub:null,google_account_email:null,scopes:[],
    write_calendar_id:null,last_sync_at:null,last_sync_status:null,last_error:null,
    updated_at:new Date().toISOString(),
  }).eq("user_id",userId);
  if(error)throw new Error("Could not disconnect Calendar");
}
