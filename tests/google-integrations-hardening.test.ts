import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CALENDAR_LIST_SCOPE,CALENDAR_READ_SCOPE,CALENDAR_OWNED_SCOPE,hasRequiredCalendarScopes} from "../src/lib/google-calendar/scope-validation.ts";
import {DRIVE_FILE_SCOPE,hasGrantedDriveFileScope} from "../src/lib/google-drive/scope-validation.ts";

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Google granular consent: identity-only access is never treated as Drive authorization",()=>{
  assert.equal(hasGrantedDriveFileScope("openid email profile"),false);
  assert.equal(hasGrantedDriveFileScope(["openid",DRIVE_FILE_SCOPE]),true);
  assert.equal(hasGrantedDriveFileScope("https://www.googleapis.com/auth/drive.readonly"),false);
});
test("Calendar requires all three read/list/write scopes",()=>{
  assert.equal(hasRequiredCalendarScopes("openid email profile"),false);
  assert.equal(hasRequiredCalendarScopes([CALENDAR_LIST_SCOPE,CALENDAR_READ_SCOPE]),false);
  assert.equal(hasRequiredCalendarScopes([CALENDAR_LIST_SCOPE,CALENDAR_READ_SCOPE,CALENDAR_OWNED_SCOPE]),true);
});
test("OAuth callbacks validate granted permissions before storing refresh tokens",()=>{
  for(const provider of ["google-drive","google-calendar"]){
    const source=read("../src/app/api/integrations/"+provider+"/callback/route.ts");
    const scopeCheck=source.indexOf(provider==="google-drive"?"hasGrantedDriveFileScope(tokens.scope)":"hasRequiredCalendarScopes(tokens.scope)");
    const persist=source.indexOf(provider==="google-drive"?"await saveDriveConnection(":"await saveCalendarConnection(");
    assert.ok(scopeCheck>=0 && scopeCheck<persist,provider+" must validate OAuth scopes before persisting");
    assert.match(source,/permission_required/);
  }
});
test("Google Drive account disconnect clears current semester and course folder mappings",()=>{
  const connection=read("../src/lib/google-drive/connection.ts");
  assert.match(connection,/export async function markDriveSetupFailed/);
  assert.match(connection,/export async function disconnectDrive/);
  assert.match(connection,/drive_folder_map:\{\}/);
  assert.match(connection,/drive_semester_folder_id:null/);
});
test("Drive provisioning propagates all database write failures",()=>{
  const setup=read("../src/lib/google-drive/setup.ts");
  for(const name of ["semesterWriteError","courseWriteError","connectionWriteError"]) {
    assert.ok(setup.includes("if("+name+")throw new Error"),"must check "+name);
  }
});
