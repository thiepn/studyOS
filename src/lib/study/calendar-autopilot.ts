import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureStudyWorkspace } from "./bootstrap";
import { getDailyOrchestration } from "./planning";
import { clipFreeWindowsAfter, computeFreeWindows, freeMinutes, schedulePlanIntoWindows, zonedDateTimeToUtc, type CalendarBusyEvent, type CalendarScheduleSettings } from "./calendar-scheduler";
import { refreshCalendarAccessToken, insertGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/lib/google-calendar/client";
import { env } from "@/lib/env";
import { StudyServiceError } from "./errors";
import { calendarWriteAdmission } from "./calendar-write-guard";

type Orchestration=Awaited<ReturnType<typeof getDailyOrchestration>>;
export type CalendarSourceRow={calendar_id:string;summary:string;access_role:string|null;is_primary:boolean;selected:boolean;writable:boolean;timezone:string|null;background_color:string|null};
export type CalendarConnectionRow={status:string;google_account_email:string|null;write_calendar_id:string|null;timezone:string|null;last_sync_at:string|null;last_sync_status:string|null;last_error:string|null;scopes:string[]};
export type CalendarPlanningSettings={day_start:string;day_end:string;minimum_block_minutes:number;calendar_buffer_minutes:number;max_block_minutes:number;include_weekends:boolean;study_reminder_minutes:number;sync_past_days:number;sync_future_days:number};
export type WeeklyRunwayDay={date:string;weekday:string;freeMinutes:number;busyEvents:number;commitmentsDue:number;commitmentMinutes:number};

function addDays(dateText:string,days:number){const d=new Date(dateText+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function defaults():CalendarPlanningSettings{return {day_start:"08:00:00",day_end:"22:00:00",minimum_block_minutes:20,calendar_buffer_minutes:10,max_block_minutes:90,include_weekends:true,study_reminder_minutes:10,sync_past_days:2,sync_future_days:21};}
function hhmm(value:string){return value.slice(0,5);}
function weekday(dateText:string,timezone:string){return new Intl.DateTimeFormat("en-US",{weekday:"short",timeZone:timezone}).format(zonedDateTimeToUtc(dateText,"12:00",timezone));}

export async function getCalendarAutopilot(orchestration?:Orchestration){
  const planData=orchestration??await getDailyOrchestration();
  const supabase=await createClient(); const {semesterId}=await ensureStudyWorkspace(supabase); const db=supabase as any;
  const [connResult,sourcesResult,settingsResult,semesterResult,blocksResult]=await Promise.all([
    db.from("study_calendar_connections").select("*").maybeSingle(),
    db.from("study_calendar_sources").select("*").order("is_primary",{ascending:false}).order("summary"),
    db.from("study_calendar_planning_settings").select("*").eq("semester_id",semesterId).maybeSingle(),
    db.from("study_semesters").select("timezone").eq("id",semesterId).single(),
    db.from("study_scheduled_blocks").select("*").eq("semester_id",semesterId).gte("plan_date",planData.capacity.local_today).order("start_at"),
  ]);
  const error=connResult.error||sourcesResult.error||settingsResult.error||semesterResult.error||blocksResult.error;
  if(error)throw new StudyServiceError("Could not load calendar autopilot",error.code||"calendar_autopilot_failed",error);
  const connection=(connResult.data??null) as CalendarConnectionRow|null;
  const sources=(sourcesResult.data??[]) as CalendarSourceRow[];
  const base=settingsResult.data??defaults();
  const settings:CalendarPlanningSettings={...defaults(),...base};
  const timezone=connection?.timezone||semesterResult.data?.timezone||"Europe/Berlin";
  const selectedIds=sources.filter(s=>s.selected).map(s=>s.calendar_id);
  const today=planData.capacity.local_today;
  const weekEnd=addDays(today,7);
  const rangeStart=zonedDateTimeToUtc(today,"00:00",timezone).toISOString();
  const rangeEnd=zonedDateTimeToUtc(weekEnd,"00:00",timezone).toISOString();
  let events:any[]=[];
  if(connection?.status==="connected"&&selectedIds.length){
    const eventResult=await db.from("study_calendar_events").select("*").in("calendar_id",selectedIds).lt("start_at",rangeEnd).gt("end_at",rangeStart).order("start_at");
    if(eventResult.error)throw new StudyServiceError("Could not load calendar events",eventResult.error.code||"calendar_events_failed",eventResult.error);
    events=eventResult.data??[];
  }
  const busy=(date:string)=>events.filter(e=>{
    const start=zonedDateTimeToUtc(date,"00:00",timezone).getTime(),end=zonedDateTimeToUtc(addDays(date,1),"00:00",timezone).getTime();
    return Date.parse(e.start_at)<end&&Date.parse(e.end_at)>start;
  }).map(e=>({startAt:e.start_at,endAt:e.end_at,status:e.status,transparency:e.transparency,allDay:e.all_day}) satisfies CalendarBusyEvent);

  const scheduleSettings:CalendarScheduleSettings={timezone,dayStart:hhmm(settings.day_start),dayEnd:hhmm(settings.day_end),minimumBlockMinutes:Number(settings.minimum_block_minutes),calendarBufferMinutes:Number(settings.calendar_buffer_minutes),maxBlockMinutes:Number(settings.max_block_minutes),includeWeekends:Boolean(settings.include_weekends)};
  const todayWindows=clipFreeWindowsAfter(computeFreeWindows(today,busy(today),scheduleSettings),new Date(),scheduleSettings.minimumBlockMinutes);
  const committed=(blocksResult.data??[]).filter((b:any)=>b.plan_date===today&&b.status==="committed");
  const committedKeys=new Set(committed.map((b:any)=>b.candidate_id));
  const placeable=planData.plan.selected.filter(item=>!committedKeys.has(item.id));
  const proposal=schedulePlanIntoWindows(placeable,todayWindows,scheduleSettings);

  const weekly:WeeklyRunwayDay[]=[];
  for(let i=0;i<7;i++){
    const date=addDays(today,i); const windows=computeFreeWindows(date,busy(date),scheduleSettings);
    const due=planData.commitments.filter(c=>{
      const local=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(c.due_at));
      return local===date;
    });
    weekly.push({date,weekday:weekday(date,timezone),freeMinutes:freeMinutes(windows),busyEvents:busy(date).filter(e=>e.status!=="cancelled"&&e.transparency!=="transparent").length,commitmentsDue:due.length,commitmentMinutes:due.reduce((sum,c)=>sum+Number(c.estimated_minutes),0)});
  }

  const courseEvents=events.filter(event=>["lecture","exercise","exam","deadline"].includes(String(event.event_role))&&event.status!=="cancelled").slice(0,16);
  return {connection,sources,settings,timezone,today,todayWindows,proposal,weekly,courseEvents,scheduledBlocks:blocksResult.data??[],stale:Boolean(connection?.last_sync_at&&Date.now()-Date.parse(connection.last_sync_at)>6*3600_000)};
}

export async function getCalendarRunwayForRange(startDate:string,days:number,orchestration?:Orchestration){
  const planData=orchestration??await getDailyOrchestration();
  const supabase=await createClient();
  const {semesterId}=await ensureStudyWorkspace(supabase);
  const db=supabase as any;
  const [connResult,sourcesResult,settingsResult,semesterResult]=await Promise.all([
    db.from("study_calendar_connections").select("*").maybeSingle(),
    db.from("study_calendar_sources").select("*").order("is_primary",{ascending:false}).order("summary"),
    db.from("study_calendar_planning_settings").select("*").eq("semester_id",semesterId).maybeSingle(),
    db.from("study_semesters").select("timezone").eq("id",semesterId).single(),
  ]);
  const error=connResult.error||sourcesResult.error||settingsResult.error||semesterResult.error;
  if(error)throw new StudyServiceError("Could not load calendar runway",error.code||"calendar_runway_failed",error);
  const connection=(connResult.data??null) as CalendarConnectionRow|null;
  const sources=(sourcesResult.data??[]) as CalendarSourceRow[];
  const settings:CalendarPlanningSettings={...defaults(),...(settingsResult.data??{})};
  const timezone=connection?.timezone||semesterResult.data?.timezone||"Europe/Berlin";
  const selectedIds=sources.filter(source=>source.selected).map(source=>source.calendar_id);
  const count=Math.max(1,Math.min(21,Math.floor(days)));
  const rangeEndDate=addDays(startDate,count);
  const rangeStart=zonedDateTimeToUtc(startDate,"00:00",timezone).toISOString();
  const rangeEnd=zonedDateTimeToUtc(rangeEndDate,"00:00",timezone).toISOString();
  let events:any[]=[];
  if(connection?.status==="connected"&&selectedIds.length){
    const eventResult=await db.from("study_calendar_events").select("*")
      .in("calendar_id",selectedIds).lt("start_at",rangeEnd).gt("end_at",rangeStart).order("start_at");
    if(eventResult.error)throw new StudyServiceError("Could not load calendar runway events",eventResult.error.code||"calendar_runway_events_failed",eventResult.error);
    events=eventResult.data??[];
  }
  const busy=(date:string)=>events.filter(event=>{
    const start=zonedDateTimeToUtc(date,"00:00",timezone).getTime();
    const end=zonedDateTimeToUtc(addDays(date,1),"00:00",timezone).getTime();
    return Date.parse(event.start_at)<end&&Date.parse(event.end_at)>start;
  }).map(event=>({
    startAt:event.start_at,endAt:event.end_at,status:event.status,transparency:event.transparency,allDay:event.all_day,
  }) satisfies CalendarBusyEvent);
  const scheduleSettings:CalendarScheduleSettings={
    timezone,dayStart:hhmm(settings.day_start),dayEnd:hhmm(settings.day_end),
    minimumBlockMinutes:Number(settings.minimum_block_minutes),calendarBufferMinutes:Number(settings.calendar_buffer_minutes),
    maxBlockMinutes:Number(settings.max_block_minutes),includeWeekends:Boolean(settings.include_weekends),
  };
  const runway:WeeklyRunwayDay[]=[];
  for(let i=0;i<count;i++){
    const date=addDays(startDate,i);
    const baseWindows=computeFreeWindows(date,busy(date),scheduleSettings);
    const windows=date===planData.capacity.local_today
      ?clipFreeWindowsAfter(baseWindows,new Date(),scheduleSettings.minimumBlockMinutes)
      :baseWindows;
    const due=planData.commitments.filter(commitment=>{
      const local=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(commitment.due_at));
      return local===date;
    });
    runway.push({
      date,weekday:weekday(date,timezone),freeMinutes:freeMinutes(windows),
      busyEvents:busy(date).filter(event=>event.status!=="cancelled"&&event.transparency!=="transparent").length,
      commitmentsDue:due.length,commitmentMinutes:due.reduce((sum,commitment)=>sum+Number(commitment.estimated_minutes),0),
    });
  }
  return {
    connection,sources,settings,timezone,startDate,endDate:addDays(startDate,count-1),days:runway,
    stale:Boolean(connection?.last_sync_at&&Date.now()-Date.parse(connection.last_sync_at)>6*3600_000),
  };
}

export async function updateCalendarSources(selectedIds:string[]){
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const userId=data?.claims?.sub?String(data.claims.sub):null;
  if(!userId)throw new StudyServiceError("Authentication required","auth_required");
  const db=supabase as any; const {data:rows,error}=await db.from("study_calendar_sources").select("calendar_id,selected").eq("user_id",userId);
  if(error)throw new StudyServiceError("Could not read calendars",error.code||"calendar_sources_failed",error);
  const allowed=new Set((rows??[]).map((r:any)=>String(r.calendar_id))); if(selectedIds.some(id=>!allowed.has(id)))throw new StudyServiceError("Unknown calendar source","invalid_calendar_source");
  const changed=(rows??[]).some((row:any)=>Boolean(row.selected)!==selectedIds.includes(String(row.calendar_id)));
  if(changed){
    // Revoke the previous success signal BEFORE changing which calendars are
    // authoritative. A failed refresh must never authorize new event writes.
    const invalidated=await createAdminClient().from("study_calendar_connections").update({
      last_sync_at:null,last_sync_status:"pending",last_error:null,updated_at:new Date().toISOString(),
    }).eq("user_id",userId);
    if(invalidated.error)throw new StudyServiceError("Could not invalidate old Calendar evidence","calendar_sync_invalidation_failed",invalidated.error);
  }
  for(const row of rows??[]){const result=await db.from("study_calendar_sources").update({selected:selectedIds.includes(String(row.calendar_id)),updated_at:new Date().toISOString()}).eq("user_id",userId).eq("calendar_id",row.calendar_id);if(result.error)throw new StudyServiceError("Could not update calendar source",result.error.code||"calendar_sources_failed",result.error);}
  return {selected:selectedIds,requiresSync:changed};
}

export async function updateCalendarPlanningSettings(input:Record<string,unknown>){
  const supabase=await createClient(); const {semesterId}=await ensureStudyWorkspace(supabase); const {data}=await supabase.auth.getClaims(); const userId=data?.claims?.sub?String(data.claims.sub):null;
  if(!userId)throw new StudyServiceError("Authentication required","auth_required");
  const dayStart=String(input.dayStart??"08:00"),dayEnd=String(input.dayEnd??"22:00");
  const minimum=Number(input.minimumBlockMinutes),buffer=Number(input.calendarBufferMinutes),max=Number(input.maxBlockMinutes),reminder=Number(input.studyReminderMinutes);
  if(!/^\d{2}:\d{2}$/.test(dayStart)||!/^\d{2}:\d{2}$/.test(dayEnd)||minimum<10||minimum>180||buffer<0||buffer>60||max<minimum||max>240||reminder<0||reminder>1440)throw new StudyServiceError("Invalid calendar planning settings","invalid_calendar_settings");
  const {error}=await (supabase as any).from("study_calendar_planning_settings").upsert({user_id:userId,semester_id:semesterId,day_start:dayStart,day_end:dayEnd,minimum_block_minutes:minimum,calendar_buffer_minutes:buffer,max_block_minutes:max,include_weekends:input.includeWeekends!==false,study_reminder_minutes:reminder,updated_at:new Date().toISOString()},{onConflict:"user_id,semester_id"});
  if(error)throw new StudyServiceError("Could not save calendar settings",error.code||"calendar_settings_failed",error);
  return {ok:true};
}

export async function commitTodaySchedule(confirmed=false){
  const orchestration=await getDailyOrchestration(); const autopilot=await getCalendarAutopilot(orchestration);
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const userId=data?.claims?.sub?String(data.claims.sub):null;
  if(!userId)throw new StudyServiceError("Authentication required","auth_required");
  const admission=calendarWriteAdmission({
    confirmed,connection:autopilot.connection,
    selectedWritableCalendar:autopilot.sources.some(source=>source.selected&&source.writable&&source.calendar_id===autopilot.connection?.write_calendar_id),
    proposedBlocks:autopilot.proposal.blocks.length,
  });
  if(!admission.allowed)throw new StudyServiceError(admission.reason,"calendar_write_not_authorized");
  // Admission already denied a missing destination; bind it explicitly so the
  // subsequent awaited Google calls never rely on nullable connection state.
  const writeCalendarId=autopilot.connection?.write_calendar_id;
  if(!writeCalendarId)throw new StudyServiceError("No writable Calendar destination","calendar_write_not_authorized");
  const admin=createAdminClient(); const token=await refreshCalendarAccessToken(userId); const created:any[]=[],errors:any[]=[];
  for(const block of autopilot.proposal.blocks){
    try{
      const existing=await admin.from("study_scheduled_blocks" as any).select("id").eq("user_id",userId).eq("plan_date",autopilot.today).eq("candidate_id",block.candidateId).eq("start_at",block.startAt).eq("status","committed").maybeSingle();
      if(existing.data)continue;
      const event=await insertGoogleCalendarEvent(token,writeCalendarId,{summary:"StudyOS · "+block.title,description:"Planned by StudyOS\n"+env.appOrigin+block.href,startAt:block.startAt,endAt:block.endAt,timezone:autopilot.timezone,reminderMinutes:Number(autopilot.settings.study_reminder_minutes),candidateId:block.candidateId});
      const row={user_id:userId,semester_id:orchestration.semesterId,course_id:block.courseId,plan_date:autopilot.today,candidate_id:block.candidateId,title:block.title,candidate_kind:block.candidateKind,start_at:block.startAt,end_at:block.endAt,scheduled_minutes:block.minutes,status:"committed",calendar_id:writeCalendarId,event_id:event.id,event_url:event.htmlLink??null,reminder_minutes:Number(autopilot.settings.study_reminder_minutes)};
      const saved=await admin.from("study_scheduled_blocks" as any).insert(row); if(saved.error)throw new Error(saved.error.message);
      created.push({candidateId:block.candidateId,eventId:event.id});
    }catch(error){errors.push({candidateId:block.candidateId,error:error instanceof Error?error.message:"Calendar write failed"});}
  }
  return {created,errors};
}

export async function cancelScheduledBlock(blockId:string){
  const supabase=await createClient(); const {data}=await supabase.auth.getClaims(); const userId=data?.claims?.sub?String(data.claims.sub):null;
  if(!userId)throw new StudyServiceError("Authentication required","auth_required");
  const {data:block,error}=await (supabase as any).from("study_scheduled_blocks").select("*").eq("id",blockId).eq("user_id",userId).single();
  if(error||!block)throw new StudyServiceError("Scheduled block not found","invalid_scheduled_block",error);
  if(block.status!=="committed")return {ok:true};
  const token=await refreshCalendarAccessToken(userId); await deleteGoogleCalendarEvent(token,block.calendar_id,block.event_id);
  const admin=createAdminClient(); const result=await admin.from("study_scheduled_blocks" as any).update({status:"cancelled",cancelled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",blockId).eq("user_id",userId);
  if(result.error)throw new StudyServiceError("Calendar event deleted but StudyOS status update failed","calendar_cancel_partial",result.error);
  return {ok:true};
}
