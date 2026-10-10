import test from "node:test";
import assert from "node:assert/strict";
import {calendarEvidenceStatus,canProposeCalendarCommit,planningDeadlineSummary,CALENDAR_EVIDENCE} from "../src/lib/study/planning-command.ts";
test("calendar state is never inferred from account connection alone",()=>{
  const base={status:"connected",last_sync_at:null,last_sync_status:null,last_error:null};
  assert.equal(calendarEvidenceStatus(null,false),"disconnected");
  assert.equal(calendarEvidenceStatus(base,false),"never_synced");
  assert.equal(calendarEvidenceStatus({...base,last_sync_at:"2026-10-10T12:00:00Z"},false),"unknown");
  assert.equal(calendarEvidenceStatus({...base,last_sync_at:"2026-10-10T12:00:00Z",last_sync_status:"ok"},true),"stale");
  assert.equal(calendarEvidenceStatus({...base,last_sync_at:"2026-10-10T12:00:00Z",last_sync_status:"ok"},false),"recent");
  assert.equal(calendarEvidenceStatus({...base,last_sync_at:"2026-10-10T12:00:00Z",last_sync_status:"error"},false),"sync_failed");
  assert.equal(calendarEvidenceStatus({...base,last_sync_at:"2026-10-10T12:00:00Z",last_sync_status:"ok",last_error:"Failed event"},false),"sync_failed");
  assert.match(CALENDAR_EVIDENCE.recent.description,/snapshot, not a live/);
});
test("only a recent successful snapshot with actual proposed blocks permits calendar commit preparation",()=>{
  for(const state of ["disconnected","never_synced","sync_failed","unknown","stale"] as const){
    assert.equal(canProposeCalendarCommit(state,3),false,state);
  }
  assert.equal(canProposeCalendarCommit("recent",0),false);
  assert.equal(canProposeCalendarCommit("recent",2),true);
});
test("deadline presentation is deterministic, time-qualified and non-mutating",()=>{
  const now=new Date("2026-10-10T12:00:00.000Z");
  const rows=[
    {id:"b",title:"Later",due_at:"2026-10-14T15:00:00Z",priority:5,estimated_minutes:120,calendar_synced:false},
    {id:"a",title:"Due soon",due_at:"2026-10-11T11:00:00Z",priority:2,estimated_minutes:65,calendar_synced:true},
    {id:"c",title:"Past due",due_at:"2026-10-09T11:00:00Z",priority:4,estimated_minutes:30,calendar_synced:false},
  ];
  const original=structuredClone(rows);
  const r=planningDeadlineSummary(rows,now);
  assert.deepEqual([r.total,r.overdue,r.dueSoon,r.minutesDueSoon,r.calendarLinked],[3,1,1,65,1]);
  assert.deepEqual(r.urgent.map(x=>x.id),["c","a","b"]);
  assert.equal(r.next?.id,"c");
  assert.deepEqual(rows,original);
});
