import { createAdminClient } from "@/lib/supabase/admin";
import { listGoogleCalendarEvents, refreshCalendarAccessToken } from "./client";
import { zonedDateTimeToUtc } from "@/lib/study/calendar-scheduler";

function classify(summary:string,courses:Array<{id:string;display_name:string;short_name:string|null;stable_key:string}>){
  const s=summary.toLocaleLowerCase("de-DE");
  const course=courses.find(c=>{
    const names=[c.display_name,c.short_name,c.stable_key].filter(Boolean).map(x=>String(x).toLocaleLowerCase("de-DE"));
    return names.some(name=>name.length>=3&&s.includes(name));
  })??null;
  let role:"busy"|"lecture"|"exercise"|"exam"|"deadline"|"study_block"|"other"="busy";
  if(/studyos/.test(s))role="study_block"; else if(/klausur|exam|prüfung/.test(s))role="exam"; else if(/übung|exercise|tutorial/.test(s))role="exercise"; else if(/vorlesung|lecture|\bvl\b/.test(s))role="lecture"; else if(/deadline|abgabe|due/.test(s))role="deadline";
  return {courseId:course?.id??null,role};
}
function eventBounds(event:any,timezone:string){
  if(event.start?.dateTime&&event.end?.dateTime)return {startAt:new Date(event.start.dateTime).toISOString(),endAt:new Date(event.end.dateTime).toISOString(),allDay:false};
  if(event.start?.date&&event.end?.date)return {startAt:zonedDateTimeToUtc(event.start.date,"00:00",timezone).toISOString(),endAt:zonedDateTimeToUtc(event.end.date,"00:00",timezone).toISOString(),allDay:true};
  return null;
}
export async function syncStudyCalendar(userId:string){
  const admin=createAdminClient(); const now=new Date();
  const [connectionResult,sourcesResult,semesterResult,coursesResult]=await Promise.all([
    admin.from("study_calendar_connections" as any).select("*").eq("user_id",userId).single(),
    admin.from("study_calendar_sources" as any).select("*").eq("user_id",userId).eq("selected",true),
    admin.from("study_semesters").select("id,timezone").eq("user_id",userId).eq("active",true).order("starts_on",{ascending:false}).limit(1).single(),
    admin.from("study_courses").select("id,display_name,short_name,stable_key").eq("user_id",userId).eq("active",true),
  ]);
  if(connectionResult.error||connectionResult.data?.status!=="connected")throw new Error("Study Calendar is not connected");
  if(sourcesResult.error)throw new Error("Could not read selected calendars");
  const settingsResult=semesterResult.data?.id?await admin.from("study_calendar_planning_settings" as any).select("sync_past_days,sync_future_days").eq("user_id",userId).eq("semester_id",semesterResult.data.id).maybeSingle():{data:null,error:null};
  const past=Number(settingsResult.data?.sync_past_days??2),future=Number(settingsResult.data?.sync_future_days??21);
  const timeMin=new Date(now.getTime()-past*86400000).toISOString(),timeMax=new Date(now.getTime()+future*86400000).toISOString();
  const token=await refreshCalendarAccessToken(userId); const courses=(coursesResult.data??[]) as any[];
  let count=0;
  try{
    for(const source of sourcesResult.data??[]){
      const events=await listGoogleCalendarEvents(token,String(source.calendar_id),timeMin,timeMax); const ids:string[]=[];
      const rows=[];
      for(const event of events){
        const bounds=eventBounds(event,String(source.timezone??connectionResult.data.timezone??semesterResult.data?.timezone??"Europe/Berlin")); if(!bounds)continue;
        ids.push(event.id); const c=classify(event.summary??"",courses);
        rows.push({user_id:userId,calendar_id:source.calendar_id,event_id:event.id,course_id:c.courseId,summary:event.summary??null,...bounds,status:event.status??null,transparency:event.transparency??null,
          event_type:event.eventType??null,event_role:c.role,location:event.location??null,event_url:event.htmlLink??null,recurring_event_id:event.recurringEventId??null,study_owned:c.role==="study_block",
          source_updated_at:event.updated??null,synced_at:new Date().toISOString(),updated_at:new Date().toISOString()});
      }
      if(rows.length){const {error}=await admin.from("study_calendar_events" as any).upsert(rows,{onConflict:"user_id,calendar_id,event_id"});if(error)throw new Error(error.message);}
      let stale=admin.from("study_calendar_events" as any).delete().eq("user_id",userId).eq("calendar_id",source.calendar_id).gte("start_at",timeMin).lt("start_at",timeMax);
      if(ids.length) stale=stale.not("event_id","in","("+ids.map(id=>'"'+id.replaceAll('"','')+'"').join(",")+")");
      await stale; count+=rows.length;
    }
    await admin.from("study_calendar_connections" as any).update({last_sync_at:new Date().toISOString(),last_sync_status:"ok",last_error:null,updated_at:new Date().toISOString()}).eq("user_id",userId);
    return {events:count,timeMin,timeMax};
  }catch(error){
    await admin.from("study_calendar_connections" as any).update({last_sync_at:new Date().toISOString(),last_sync_status:"error",last_error:error instanceof Error?error.message:"Calendar sync failed",updated_at:new Date().toISOString()}).eq("user_id",userId);
    throw error;
  }
}
