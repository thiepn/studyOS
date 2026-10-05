import { createAdminClient } from "@/lib/supabase/admin";
import { encryptCalendarRefreshToken } from "./crypto";
import { listGoogleCalendars } from "./client";

export async function saveCalendarConnection(input:{userId:string;googleSub:string;email?:string;scopes:string[];refreshToken:string;accessToken:string}){
  const admin=createAdminClient(); const now=new Date().toISOString();
  const encrypted=encryptCalendarRefreshToken(input.refreshToken);
  const {error:credError}=await admin.from("study_calendar_credentials" as any).upsert({user_id:input.userId,encrypted_refresh_token:encrypted,encryption_version:1,updated_at:now},{onConflict:"user_id"});
  if(credError)throw new Error("Could not store Calendar credential: "+credError.message);
  const calendars=await listGoogleCalendars(input.accessToken);
  const write=calendars.find(c=>c.primary&&["owner","writer"].includes(c.accessRole??""))??calendars.find(c=>["owner","writer"].includes(c.accessRole??""));
  const primary=calendars.find(c=>c.primary);
  const {error:connError}=await admin.from("study_calendar_connections" as any).upsert({
    user_id:input.userId,google_account_sub:input.googleSub,google_account_email:input.email??null,scopes:input.scopes,status:"connected",
    write_calendar_id:write?.id??null,timezone:primary?.timeZone??write?.timeZone??"Europe/Berlin",connected_at:now,last_error:null,updated_at:now,
  },{onConflict:"user_id"});
  if(connError)throw new Error("Could not store Calendar connection: "+connError.message);
  if(calendars.length){
    const rows=calendars.map(c=>({user_id:input.userId,calendar_id:c.id,summary:c.summary,access_role:c.accessRole??null,is_primary:Boolean(c.primary),
      selected:Boolean(c.primary),writable:["owner","writer"].includes(c.accessRole??""),timezone:c.timeZone??null,background_color:c.backgroundColor??null,last_seen_at:now,updated_at:now}));
    const {error}=await admin.from("study_calendar_sources" as any).upsert(rows,{onConflict:"user_id,calendar_id"}); if(error)throw new Error("Could not store Calendar list: "+error.message);
  }
}
export async function disconnectCalendar(userId:string){
  const admin=createAdminClient();
  await admin.from("study_calendar_credentials" as any).delete().eq("user_id",userId);
  await admin.from("study_calendar_events" as any).delete().eq("user_id",userId);
  await admin.from("study_calendar_sources" as any).delete().eq("user_id",userId);
  const {error}=await admin.from("study_calendar_connections" as any).update({status:"disconnected",google_account_sub:null,google_account_email:null,scopes:[],write_calendar_id:null,last_sync_at:null,last_sync_status:null,last_error:null,updated_at:new Date().toISOString()}).eq("user_id",userId);
  if(error)throw new Error("Could not disconnect Calendar: "+error.message);
}
