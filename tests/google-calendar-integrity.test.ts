import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isStudyOwnedCalendarEvent } from "../src/lib/google-calendar/event-policy.ts";

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");

test("calendar titles cannot claim app-owned event identity",()=>{
  assert.equal(isStudyOwnedCalendarEvent({}),false);
  assert.equal(isStudyOwnedCalendarEvent(null),false);
  assert.equal(isStudyOwnedCalendarEvent({extendedProperties:{private:{studyOS:"0"}}}),false);
  assert.equal(isStudyOwnedCalendarEvent({extendedProperties:{private:{studyOS:"1",candidateId:"test"}}}),true);
});
test("owned-events scope never selects a shared writer calendar",()=>{
  const code=read("../src/lib/google-calendar/connection.ts");
  assert.match(code,/c\.accessRole==="owner"/);
  assert.doesNotMatch(code,/\["owner","writer"\]/);
});
test("Calendar sync scopes courses and checks database stale deletes",()=>{
  const code=read("../src/lib/google-calendar/sync.ts");
  assert.match(code,/\.eq\("semester_id",semesterResult\.data\.id\)/);
  assert.match(code,/if\(staleError\)throw/);
  assert.match(code,/study_owned:isStudyOwnedCalendarEvent\(event\)/);
});
test("Cancelled Calendar events without start/end close open deadlines",()=>{
  const code=read("../src/lib/google-calendar/sync.ts");
  assert.match(code,/if\(event\.status==="cancelled"\)/);
  assert.match(code,/status:"cancelled"/);
});
