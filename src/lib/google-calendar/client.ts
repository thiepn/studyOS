import { createAdminClient } from "@/lib/supabase/admin";
import { decryptCalendarRefreshToken } from "./crypto";
import { requireCalendarServerEnv } from "@/lib/env";

export type GoogleCalendarListEntry={
  id:string;summary:string;accessRole?:string;primary?:boolean;timeZone?:string;backgroundColor?:string;
};
export type GoogleCalendarEvent={
  id:string;summary?:string;status?:string;transparency?:string;eventType?:string;location?:string;htmlLink?:string;
  recurringEventId?:string;updated?:string;extendedProperties?:{private?:Record<string,string>};
  start:{dateTime?:string;date?:string;timeZone?:string};end:{dateTime?:string;date?:string;timeZone?:string};
};

export async function refreshCalendarAccessToken(userId:string){
  const admin=createAdminClient();
  const {data,error}=await admin.from("study_calendar_credentials").select("encrypted_refresh_token").eq("user_id",userId).single();
  if(error||!data?.encrypted_refresh_token) throw new Error("Google Calendar refresh token is unavailable");
  const {clientId,clientSecret}=requireCalendarServerEnv();
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:decryptCalendarRefreshToken(String(data.encrypted_refresh_token)),grant_type:"refresh_token"}),cache:"no-store"});
  if(!response.ok){
    const failure=await response.json().catch(()=>null) as {error?:string}|null;
    if(failure?.error==="invalid_grant"){
      const {error:stateError}=await admin.from("study_calendar_connections").update({
        status:"error",last_error:"Google Calendar authorization expired or was revoked. Reconnect Calendar.",
        updated_at:new Date().toISOString(),
      }).eq("user_id",userId);
      if(stateError)throw new Error("Could not record expired Google Calendar authorization");
      throw new Error("Google Calendar authorization expired or was revoked. Reconnect Calendar.");
    }
    throw new Error("Google Calendar token refresh failed ("+response.status+")");
  }
  const payload=await response.json() as {access_token:string}; return payload.access_token;
}
async function calendarFetch<T>(accessToken:string,path:string,init?:RequestInit):Promise<T>{
  const response=await fetch("https://www.googleapis.com/calendar/v3/"+path,{...init,headers:{authorization:"Bearer "+accessToken,...(init?.headers??{})},cache:"no-store"});
  if(!response.ok){const detail=await response.text().catch(()=> "");throw new Error("Calendar API "+response.status+": "+detail.slice(0,500));}
  return response.status===204?(undefined as T):response.json() as Promise<T>;
}
export async function listGoogleCalendars(accessToken:string){
  const rows:GoogleCalendarListEntry[]=[]; let token="";
  do{
    const suffix=token?"&pageToken="+encodeURIComponent(token):"";
    const data=await calendarFetch<{items?:GoogleCalendarListEntry[];nextPageToken?:string}>(accessToken,"users/me/calendarList?maxResults=250"+suffix);
    rows.push(...(data.items??[])); token=data.nextPageToken??"";
  }while(token);
  return rows;
}
export async function listGoogleCalendarEvents(accessToken:string,calendarId:string,timeMin:string,timeMax:string){
  const rows:GoogleCalendarEvent[]=[]; let token="";
  do{
    const params=new URLSearchParams({timeMin,timeMax,singleEvents:"true",orderBy:"startTime",maxResults:"2500"});
    if(token)params.set("pageToken",token);
    const data=await calendarFetch<{items?:GoogleCalendarEvent[];nextPageToken?:string}>(accessToken,"calendars/"+encodeURIComponent(calendarId)+"/events?"+params);
    rows.push(...(data.items??[])); token=data.nextPageToken??"";
  }while(token);
  return rows;
}
export async function insertGoogleCalendarEvent(accessToken:string,calendarId:string,input:{
  summary:string;description?:string;startAt:string;endAt:string;timezone:string;reminderMinutes:number;candidateId:string;
}){
  return calendarFetch<{id:string;htmlLink?:string;start:{dateTime?:string};end:{dateTime?:string}}>(accessToken,"calendars/"+encodeURIComponent(calendarId)+"/events",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      summary:input.summary,description:input.description,
      start:{dateTime:input.startAt,timeZone:input.timezone},end:{dateTime:input.endAt,timeZone:input.timezone},
      transparency:"opaque",reminders:input.reminderMinutes>0?{useDefault:false,overrides:[{method:"popup",minutes:input.reminderMinutes}]}:{useDefault:false,overrides:[]},
      extendedProperties:{private:{studyOS:"1",candidateId:input.candidateId}},
    }),
  });
}
export async function deleteGoogleCalendarEvent(accessToken:string,calendarId:string,eventId:string){
  return calendarFetch<void>(accessToken,"calendars/"+encodeURIComponent(calendarId)+"/events/"+encodeURIComponent(eventId),{method:"DELETE"});
}
