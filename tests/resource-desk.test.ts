import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {declaredAuthorityLabel,filterSourceIndex,resourceDeskSummary,sourceStatusLabel,verifiedSource,
  type SourceIndexItem} from "../src/lib/study/resource-desk.ts";
const read=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
const item=(id:string,status:string,type="lecture",authority="unknown"):SourceIndexItem=>({
  id,course_id:"c1",title:id,resource_type:type,processing_status:status,source_authority:authority,
  drive_url:null,content_sha256:null,published_at:null,
});
test("only verified is verified; mapped and declared official authority never count as approval",()=>{
  const a=item("Mapped lecture","mapped","lecture","official_course"),b=item("Verified solution","verified","solution","official_solution");
  const data=resourceDeskSummary([a,b],2,3,1);
  assert.deepEqual(data,{registered:2,verified:1,pending:1,queued:2,candidates:3,intake:1});
  assert.equal(verifiedSource(a),false);assert.equal(verifiedSource(b),true);
  assert.match(sourceStatusLabel("mapped"),/not verified/);
  assert.equal(sourceStatusLabel("unsupported"),"Unrecognized status · not verified");
  assert.equal(declaredAuthorityLabel("official_course"),"Declared official course");
  assert.equal(declaredAuthorityLabel("alien"),"Unrecognized authority");
});
test("source index filters only already-scoped input, case-insensitively and without mutation",()=>{
  const rows=[item("Ana II Blatt","mapped","exercise","official_course"),item("Lecture proofs","verified","lecture"),item("Official solution","verified","solution")];
  const before=structuredClone(rows);
  assert.deepEqual(filterSourceIndex(rows,{query:"ANA",status:"pending",type:"exercise"}).map(x=>x.id),["Ana II Blatt"]);
  assert.deepEqual(filterSourceIndex(rows,{query:"solution",status:"verified",type:"all"}).map(x=>x.id),["Official solution"]);
  assert.deepEqual(filterSourceIndex(rows,{query:"absent",status:"all",type:"all"}),[]);
  assert.deepEqual(filterSourceIndex([], {query:"",status:"all",type:"all"}),[]);
  assert.deepEqual(rows,before);
});
test("F09 source desk renders protected scoped data, native search and truthful provenance",()=>{
  const page=read("../src/app/resources/page.tsx"),library=read("../src/components/source-index.tsx");
  const intake=read("../src/components/drive-intake-index.tsx"),styles=read("../src/app/resource-desk.css");
  assert.match(page,/scopeCourseRecords\(data\.resources,selectedCourse\?\.id\?\?null\)/);
  assert.match(page,/<SourceIndex resources=\{resources\}/);
  assert.match(page,/<DriveIntakeIndex items=\{unresolvedIntake\}/);
  assert.match(library,/type="search"/);
  assert.match(library,/aria-live="polite"/);
  assert.match(library,/data-verified=\{verifiedSource\(item\)\}/);
  assert.match(intake,/not independently verified/);
  assert.match(styles,/@media\(max-width:600px\)/);
  assert.match(styles,/@media\(forced-colors:active\)/);
  assert.doesNotMatch(styles,/(?:linear|radial|conic)-gradient\(/);
});
test("manual candidate cannot fabricate confidence, source authority defaults unknown and decisions stay gated",()=>{
  const form=read("../src/components/processing-candidate-form.tsx");
  const register=read("../src/components/resource-register-form.tsx");
  const decision=read("../src/components/ingestion-decision-buttons.tsx");
  assert.doesNotMatch(form,/extractionConfidence:\s*0\.9/);
  assert.match(form,/processorVersion: "p9", validationIssues: \[\]/);
  assert.match(register,/name="sourceAuthority" defaultValue="unknown"/);
  assert.match(decision,/disabled=\{busy!==null\|\|disableAccept\|\|!reviewed\}/);
  assert.match(decision,/reason:action==="reject"\?rejectReason\.trim\(\):undefined/);
  assert.match(read("../src/app/resources/page.tsx"),/disableAccept=\{blocking > 0\}/);
  assert.match(read("../src/app/resources/page.tsx"),/JSON\.stringify\(run\.candidate_payload,null,2\)/);
});
