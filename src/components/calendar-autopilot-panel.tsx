"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

type Props={
  data:{
    connection:null|{status:string;google_account_email:string|null;last_sync_at:string|null;last_sync_status:string|null;last_error:string|null};
    sources:Array<{calendar_id:string;summary:string;access_role:string|null;is_primary:boolean;selected:boolean;writable:boolean;background_color:string|null}>;
    settings:{day_start:string;day_end:string;minimum_block_minutes:number;calendar_buffer_minutes:number;max_block_minutes:number;include_weekends:boolean;study_reminder_minutes:number};
    timezone:string;today:string;stale:boolean;
    proposal:{blocks:Array<{candidateId:string;title:string;startAt:string;endAt:string;minutes:number;partial:boolean}>;unscheduled:Array<{id:string;title:string;scheduledMinutes:number}>};
    weekly:Array<{date:string;weekday:string;freeMinutes:number;busyEvents:number;commitmentsDue:number;commitmentMinutes:number}>;
    scheduledBlocks:Array<{id:string;title:string;start_at:string;end_at:string;status:string;event_url:string|null;scheduled_minutes:number;plan_date:string}>;
  }
};

function time(iso:string,tz:string){return new Date(iso).toLocaleTimeString("en-GB",{timeZone:tz,hour:"2-digit",minute:"2-digit"});}
function dateLabel(date:string,tz:string){return new Date(date+"T12:00:00Z").toLocaleDateString("en-GB",{timeZone:tz,day:"2-digit",month:"short"});}

export function CalendarAutopilotPanel({data}:Props){
  const router=useRouter(); const [busy,setBusy]=useState<string|null>(null); const [message,setMessage]=useState<string|null>(null);
  const [selected,setSelected]=useState<string[]>(data.sources.filter(x=>x.selected).map(x=>x.calendar_id));
  const futureBlocks=useMemo(()=>data.scheduledBlocks.filter(x=>x.status==="committed"),[data.scheduledBlocks]);

  async function post(path:string,body?:unknown){
    setBusy(path);setMessage(null);
    try{
      const response=await fetch(path,{method:"POST",headers:body?{"content-type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});
      const json=await response.json().catch(()=>({})); if(!response.ok)throw new Error(json?.error||"Request failed");
      if(path.endsWith("/commit"))setMessage((json.created?.length??0)+" calendar block(s) created"+((json.errors?.length??0)?"; "+json.errors.length+" failed.":"."));
      else setMessage(json?.note??"Updated.");
      router.refresh(); return json;
    }catch(error){setMessage(error instanceof Error?error.message:"Request failed");return null;}
    finally{setBusy(null);}
  }

  async function saveSources(){
    const result=await post("/api/study/calendar/sources",{selectedIds:selected});
    if(result)await post("/api/integrations/google-calendar/sync");
  }
  async function saveSettings(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); const fd=new FormData(event.currentTarget);
    await post("/api/study/calendar/settings",{
      dayStart:fd.get("dayStart"),dayEnd:fd.get("dayEnd"),minimumBlockMinutes:Number(fd.get("minimum")),
      calendarBufferMinutes:Number(fd.get("buffer")),maxBlockMinutes:Number(fd.get("maxBlock")),
      includeWeekends:fd.get("weekends")==="on",studyReminderMinutes:Number(fd.get("reminder")),
    });
  }

  if(!data.connection||data.connection.status!=="connected")return <section className="panel calendar-panel">
    <div className="section-heading"><div><p className="eyebrow">P11 · Calendar-aware planning</p><h2>Study Calendar</h2></div><span>Off</span></div>
    <p>Connect the Google Calendar account you want StudyOS to use. It is a separate OAuth connection from Study Drive and from any Google account connected to ChatGPT.</p>
    <a className="primary-button" href="/api/integrations/google-calendar/start">Connect Study Calendar</a>
    <p className="muted tiny">Only the primary calendar is selected initially. Other visible calendars remain excluded until you select them here.</p>
  </section>;

  return <section className="panel calendar-panel">
    <div className="section-heading"><div><p className="eyebrow">P11 · Calendar-aware planning</p><h2>Study Calendar</h2></div><span>{data.stale?"stale":"synced"}</span></div>
    <div className="calendar-connection">
      <div><strong>{data.connection.google_account_email??"Connected Google account"}</strong><span>{data.connection.last_sync_at?"Last sync "+new Date(data.connection.last_sync_at).toLocaleString():"Not synced yet"}{data.connection.last_sync_status?" · "+data.connection.last_sync_status:""}</span></div>
      <div className="button-row">
        <button className="secondary-button button-reset" disabled={Boolean(busy)} onClick={()=>void post("/api/integrations/google-calendar/sync")}>{busy?.includes("/sync")?"Syncing…":"Sync now"}</button>
        <a className="secondary-button" href="/api/integrations/google-calendar/start">Switch account</a>
        <button className="secondary-button button-reset" disabled={Boolean(busy)} onClick={()=>void post("/api/integrations/google-calendar/disconnect")}>Disconnect</button>
      </div>
    </div>
    {data.connection.last_error?<p className="warning-text">{data.connection.last_error}</p>:null}

    <div className="calendar-grid">
      <div>
        <div className="subheading"><h3>Today&apos;s time placement</h3><span>{data.timezone}</span></div>
        {data.proposal.blocks.length?<div className="calendar-proposal">{data.proposal.blocks.map((block)=><article key={block.candidateId+block.startAt}>
          <div className="calendar-time"><strong>{time(block.startAt,data.timezone)}</strong><span>– {time(block.endAt,data.timezone)}</span></div>
          <div><strong>{block.title}</strong><span>{block.minutes} min{block.partial?" · partial":""}</span></div>
        </article>)}</div>:<p className="muted">No new P10 task currently needs calendar placement.</p>}
        {data.proposal.unscheduled.length?<p className="warning-text">{data.proposal.unscheduled.length} planned item(s) do not fit the current free windows. StudyOS leaves them unscheduled instead of creating overlaps.</p>:null}
        {data.proposal.blocks.length?<button className="primary-button button-reset" disabled={Boolean(busy)} onClick={()=>void post("/api/study/calendar/commit")}>{busy?.includes("/commit")?"Creating events…":"Commit today to Google Calendar"}</button>:null}
        <p className="muted tiny">Committed blocks are busy events with a {data.settings.study_reminder_minutes}-minute Google Calendar popup reminder.</p>
      </div>

      <div>
        <div className="subheading"><h3>Seven-day runway</h3><span>calendar capacity</span></div>
        <div className="weekly-runway">{data.weekly.map(day=><article key={day.date} className={day.commitmentsDue?"has-deadline":""}>
          <div><strong>{day.weekday}</strong><span>{dateLabel(day.date,data.timezone)}</span></div>
          <b>{Math.floor(day.freeMinutes/60)}h {day.freeMinutes%60}m free</b>
          <small>{day.busyEvents} busy event{day.busyEvents===1?"":"s"}{day.commitmentsDue?" · "+day.commitmentsDue+" due":""}</small>
        </article>)}</div>
      </div>
    </div>

    {futureBlocks.length?<details className="calendar-scheduled"><summary>Committed StudyOS blocks ({futureBlocks.length})</summary><div>{futureBlocks.map(block=><article key={block.id}>
      <div><strong>{block.title}</strong><span>{dateLabel(block.plan_date,data.timezone)} · {time(block.start_at,data.timezone)}–{time(block.end_at,data.timezone)}</span></div>
      <div>{block.event_url?<a href={block.event_url} target="_blank" rel="noreferrer">Calendar</a>:null}<button type="button" disabled={Boolean(busy)} onClick={()=>void post("/api/study/calendar/blocks/"+block.id+"/cancel")}>Cancel block</button></div>
    </article>)}</div></details>:null}

    <details className="calendar-settings"><summary>Calendar sources & scheduling rules</summary>
      <div className="calendar-source-list"><p className="muted tiny">Only selected calendars block study time.</p>{data.sources.map(source=><label key={source.calendar_id}>
        <input type="checkbox" checked={selected.includes(source.calendar_id)} onChange={(e)=>setSelected(list=>e.target.checked?[...list,source.calendar_id]:list.filter(id=>id!==source.calendar_id))}/>
        <span><strong>{source.summary}</strong><small>{source.is_primary?"primary · ":""}{source.access_role??"calendar"}</small></span>
      </label>)}</div>
      <button className="secondary-button button-reset" type="button" disabled={Boolean(busy)} onClick={()=>void saveSources()}>Save sources & sync</button>
      <form className="calendar-settings-form" onSubmit={saveSettings}>
        <label><span>Study day starts</span><input name="dayStart" type="time" defaultValue={data.settings.day_start.slice(0,5)}/></label>
        <label><span>Study day ends</span><input name="dayEnd" type="time" defaultValue={data.settings.day_end.slice(0,5)}/></label>
        <label><span>Minimum block</span><input name="minimum" type="number" min="10" max="180" defaultValue={data.settings.minimum_block_minutes}/><small>min</small></label>
        <label><span>Calendar buffer</span><input name="buffer" type="number" min="0" max="60" defaultValue={data.settings.calendar_buffer_minutes}/><small>min</small></label>
        <label><span>Maximum block</span><input name="maxBlock" type="number" min="20" max="240" defaultValue={data.settings.max_block_minutes}/><small>min</small></label>
        <label><span>Reminder</span><input name="reminder" type="number" min="0" max="1440" defaultValue={data.settings.study_reminder_minutes}/><small>min before</small></label>
        <label className="calendar-checkbox"><input name="weekends" type="checkbox" defaultChecked={data.settings.include_weekends}/><span>Schedule on weekends</span></label>
        <button className="secondary-button button-reset" disabled={Boolean(busy)} type="submit">Save scheduling rules</button>
      </form>
    </details>
    {message?<p className="form-message" role="status">{message}</p>:null}
  </section>;
}
