import test from "node:test";
import assert from "node:assert/strict";
import { clipFreeWindowsAfter, computeFreeWindows, freeMinutes, schedulePlanIntoWindows, zonedDateTimeToUtc } from "../src/lib/study/calendar-scheduler.ts";
import type { PlannedItem } from "../src/lib/study/planner.ts";

const settings={timezone:"Europe/Berlin",dayStart:"08:00",dayEnd:"22:00",minimumBlockMinutes:20,calendarBufferMinutes:10,maxBlockMinutes:90,includeWeekends:true};

function planned(id:string,minutes:number,extra:Partial<PlannedItem>={}):PlannedItem{
  return {id,kind:"workflow",courseId:"c1",courseName:"Course",title:id,reason:"test",href:"/courses/c1",estimatedMinutes:minutes,priority:80,
    scheduledMinutes:minutes,partial:false,splittable:true,allowedInRecovery:true,...extra};
}

test("timezone conversion handles Berlin DST after autumn transition",()=>{
  assert.equal(zonedDateTimeToUtc("2026-10-05","08:00","Europe/Berlin").toISOString(),"2026-10-05T06:00:00.000Z");
  assert.equal(zonedDateTimeToUtc("2026-10-26","08:00","Europe/Berlin").toISOString(),"2026-10-26T07:00:00.000Z");
});

test("free windows clip busy events and apply calendar buffers",()=>{
  const windows=computeFreeWindows("2026-10-05",[
    {startAt:"2026-10-05T08:00:00.000Z",endAt:"2026-10-05T10:00:00.000Z",status:"confirmed",transparency:"opaque"},
  ],settings);
  assert.equal(windows[0].startAt,"2026-10-05T06:00:00.000Z");
  assert.equal(windows[0].endAt,"2026-10-05T07:50:00.000Z");
  assert.equal(windows[1].startAt,"2026-10-05T10:10:00.000Z");
});

test("transparent and cancelled events do not consume study availability",()=>{
  const windows=computeFreeWindows("2026-10-05",[
    {startAt:"2026-10-05T08:00:00.000Z",endAt:"2026-10-05T10:00:00.000Z",status:"cancelled",transparency:"opaque"},
    {startAt:"2026-10-05T12:00:00.000Z",endAt:"2026-10-05T13:00:00.000Z",status:"confirmed",transparency:"transparent"},
  ],settings);
  assert.equal(windows.length,1);
  assert.equal(freeMinutes(windows),14*60);
});

test("non-splittable timed exam waits for one continuous window",()=>{
  const windows=[
    {startAt:"2026-10-05T06:00:00.000Z",endAt:"2026-10-05T07:00:00.000Z",minutes:60},
    {startAt:"2026-10-05T08:00:00.000Z",endAt:"2026-10-05T09:00:00.000Z",minutes:60},
  ];
  const item=planned("exam",90,{kind:"exam_strategy",splittable:false,heavy:true});
  const result=schedulePlanIntoWindows([item],windows,settings);
  assert.equal(result.blocks.length,0);
  assert.equal(result.unscheduled[0].scheduledMinutes,90);
});

test("splittable plan is placed without crossing busy gaps",()=>{
  const windows=[
    {startAt:"2026-10-05T06:00:00.000Z",endAt:"2026-10-05T06:40:00.000Z",minutes:40},
    {startAt:"2026-10-05T08:00:00.000Z",endAt:"2026-10-05T09:00:00.000Z",minutes:60},
  ];
  const result=schedulePlanIntoWindows([planned("sheet",75)],windows,settings);
  assert.equal(result.blocks.length,2);
  assert.deepEqual(result.blocks.map((b)=>b.minutes),[40,35]);
  assert.equal(result.unscheduled.length,0);
});


test("today windows are clipped after the current clock and rounded forward",()=>{
  const windows=[{startAt:"2026-10-05T06:00:00.000Z",endAt:"2026-10-05T16:00:00.000Z",minutes:600}];
  const clipped=clipFreeWindowsAfter(windows,new Date("2026-10-05T13:14:20.000Z"),20,5);
  assert.equal(clipped[0].startAt,"2026-10-05T13:15:00.000Z");
  assert.equal(clipped[0].minutes,165);
});
