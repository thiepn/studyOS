import test from "node:test";
import assert from "node:assert/strict";
import {connectionView, switchCheck, switchErrorMessage, connectionNotice, assertSwitchAllowed, ConnectionSwitchError} from "../src/lib/study/connection-recovery.ts";

test("Study Drive and Calendar states never assume connector sign-in",()=>{
  assert.equal(connectionView("drive",null).state,"missing");
  const drive=connectionView("drive",{status:"connected",google_account_email:"files@example.test",last_scan_at:"2026-10-09T12:00:00Z"});
  const calendar=connectionView("calendar",{status:"error",google_account_email:"events@example.test",last_sync_at:null});
  assert.equal(drive.accountEmail,"files@example.test");
  assert.equal(drive.lastActivity,"2026-10-09T12:00:00Z");
  assert.equal(calendar.accountEmail,"events@example.test");
  assert.equal(calendar.state,"error");
  assert.equal(calendar.canRetry,true);
  assert.notEqual(drive.accountEmail,calendar.accountEmail);
});
test("implicit account switches are refused; same identity can reconnect",()=>{
  assert.deepEqual(switchCheck({previousGoogleSub:"old",nextGoogleSub:"new",approved:false}),{allowed:false,reason:"confirmation_required"});
  assert.deepEqual(switchCheck({previousGoogleSub:"old",nextGoogleSub:"old",approved:false}),{allowed:true,reason:null});
  assert.equal(switchCheck({previousGoogleSub:null,nextGoogleSub:"new",approved:false}).allowed,true);
  assert.equal(switchCheck({previousGoogleSub:"old",nextGoogleSub:"new",approved:true}).allowed,true);
});
test("committed calendar blocks cannot be stranded by account switching",()=>{
  const result=switchCheck({previousGoogleSub:"old",nextGoogleSub:"new",approved:true,pendingCalendarBlocks:2});
  assert.deepEqual(result,{allowed:false,reason:"calendar_blocks_pending"});
  assert.match(switchErrorMessage("calendar_blocks_pending"),/Cancel or complete/);
});
test("recovery notices are fixed user-safe messages",()=>{
  assert.match(connectionNotice("drive_confirmation_required")??"",/unchanged/);
  assert.equal(connectionNotice("raw-provider-error"),null);
  assert.equal(connectionNotice(undefined),null);
});

test("switch guards reject unapproved and unreconciled authorizations before persistence",()=>{
  assert.throws(()=>assertSwitchAllowed({previousGoogleSub:"one",nextGoogleSub:"two",approved:false}),
    (e:unknown)=>e instanceof ConnectionSwitchError&&e.reason==="confirmation_required");
  assert.throws(()=>assertSwitchAllowed({previousGoogleSub:"one",nextGoogleSub:"two",approved:true,pendingCalendarBlocks:1}),
    (e:unknown)=>e instanceof ConnectionSwitchError&&e.reason==="calendar_blocks_pending");
  assert.doesNotThrow(()=>assertSwitchAllowed({previousGoogleSub:"one",nextGoogleSub:"one",approved:false,pendingCalendarBlocks:1}));
});
