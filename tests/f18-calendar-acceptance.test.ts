import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {calendarWriteAdmission} from "../src/lib/study/calendar-write-guard.ts";
const at=Date.parse("2026-10-10T18:00:00Z");
const baseline={
  confirmed:true,connection:{status:"connected",write_calendar_id:"owned",
    last_sync_at:"2026-10-10T17:00:00Z",last_sync_status:"ok",last_error:null},
  selectedWritableCalendar:true,proposedBlocks:1,
} as const;
test("Calendar writes require a real recent complete sync and explicit confirmation",()=>{
  assert.equal(calendarWriteAdmission(baseline,at).allowed,true);
  assert.equal(calendarWriteAdmission({...baseline,confirmed:false},at).allowed,false);
  assert.equal(calendarWriteAdmission({...baseline,selectedWritableCalendar:false},at).allowed,false);
  assert.equal(calendarWriteAdmission({...baseline,proposedBlocks:0},at).allowed,false);
  assert.equal(calendarWriteAdmission({...baseline,connection:null},at).allowed,false);
  assert.equal(calendarWriteAdmission({...baseline,connection:{...baseline.connection,status:"error"}},at).allowed,false);
  assert.equal(calendarWriteAdmission({...baseline,connection:{...baseline.connection,last_sync_status:"pending"}},at).allowed,false);
  assert.equal(calendarWriteAdmission({...baseline,connection:{...baseline.connection,last_error:"source failed"}},at).allowed,false);
  assert.equal(calendarWriteAdmission({...baseline,connection:{...baseline.connection,last_sync_at:null}},at).allowed,false);
});
test("Calendar write gate rejects stale, future and malformed evidence",()=>{
  for(const stamp of ["2026-10-10T11:59:59Z","2026-10-10T18:00:01Z","invalid"]){
    assert.equal(calendarWriteAdmission({...baseline,connection:{...baseline.connection,last_sync_at:stamp}},at).allowed,false,stamp);
  }
  assert.equal(calendarWriteAdmission({...baseline,connection:{...baseline.connection,last_sync_at:"2026-10-10T12:00:00Z"}},at).allowed,true);
});
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
test("Server Calendar POST cannot bypass owner confirmation or fresh sync admission",()=>{
  const route=read("../src/app/api/study/calendar/commit/route.ts");
  const engine=read("../src/lib/study/calendar-autopilot.ts");
  const client=read("../src/components/calendar-autopilot-panel.tsx");
  assert.match(route,/confirmed!==true/);
  assert.match(route,/commitTodaySchedule\(true\)/);
  assert.match(engine,/calendarWriteAdmission\(/);
  assert.match(client,/post\("\/api\/study\/calendar\/commit",\{confirmed:true\}\)/);
});
test("Calendar source edits revoke old success before the local selection changes",()=>{
  const engine=read("../src/lib/study/calendar-autopilot.ts");
  const invalidate=engine.indexOf("last_sync_status:\"pending\"");
  const update=engine.indexOf(".update({selected:selectedIds.includes");
  assert.ok(invalidate>0&&update>invalidate);
});
test("Selected Calendar feeds finish fetching before local ledger writes",()=>{
  const sync=read("../src/lib/google-calendar/sync.ts");
  assert.ok(sync.indexOf("const feeds=await Promise.all")<sync.indexOf("study_calendar_events\").upsert"));
  assert.match(sync,/classify\(event.summary\?\?"",courses,isStudyOwnedCalendarEvent\(event\)\)/);
  assert.doesNotMatch(sync,/if\(\/studyos\/\.test\(s\)\)/);
  const client=read("../src/lib/google-calendar/client.ts");
  assert.match(client,/seenTokens\.has\(token\)/);
});
