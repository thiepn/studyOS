import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {readPagedIndependentAttempts,FirstWeekPagingError,PROOF_PAGE_SIZE,PROOF_MAX_ROWS} from "../src/lib/study/first-week-paging.ts";
import {OFFLINE_QUEUE_KEYS,inspectOfflineCustody,offlineCustodyExplanation,type OfflineQueueRaw} from "../src/lib/study/offline-recovery.ts";

const owner="550e8400-e29b-41d4-a716-446655440000",other="550e8400-e29b-41d4-a716-446655440001";
const raw=(a:unknown[]=[],b:unknown[]=[],c:unknown[]=[]):OfflineQueueRaw=>({
  [OFFLINE_QUEUE_KEYS[0]]:JSON.stringify(a),[OFFLINE_QUEUE_KEYS[1]]:JSON.stringify(b),[OFFLINE_QUEUE_KEYS[2]]:JSON.stringify(c)
});
type Attempt={id:string;question_id:string;course_id:string;independence:string};
function mockDb(rows:Attempt[],opts:{fail?:boolean;malformed?:boolean}={}){
 const events:{table:string;eq:[string,unknown][];groups:[string,unknown[]][];order:string;range:[number,number]}[]=[];
 return {events,from(table:string){
   const filters:{eq:[string,unknown][];groups:[string,unknown[]][];order:string;range:[number,number]}={eq:[],groups:[],order:"",range:[0,0]};
   return {select(_cols:string){return this;},eq(k:string,v:unknown){filters.eq.push([k,v]);return this;},
     in(k:string,v:unknown[]){filters.groups.push([k,v]);return this;},
     order(k:string){filters.order=k;return this;},
     async range(start:number,end:number){
       filters.range=[start,end];events.push({table,...filters});
       if(opts.fail)return {data:null,error:{code:"PGRST999"}};
       if(opts.malformed)return {data:null,error:null};
       const chosen=rows.filter(row=>filters.eq.every(([k,v])=>(row as unknown as Record<string,unknown>)[k]===v)
         &&filters.groups.every(([k,values])=>values.includes((row as unknown as Record<string,unknown>)[k])))
         .sort((a,b)=>a.id.localeCompare(b.id));
       return {data:chosen.slice(start,end+1),error:null};
     }
   };
 }};
}
function rows(count:number,question="q1"):Attempt[]{
 return Array.from({length:count},(_,i)=>({id:String(i).padStart(8,"0"),question_id:question,
   course_id:"courseA",independence:"independent"}));
}
test("real Week-1 proof fetches a stable >1000 attempt history without dropping late evidence",async()=>{
 const db=mockDb(rows(1207));const result=await readPagedIndependentAttempts(db,owner,["courseA"],["q1"]);
 assert.equal(result.length,1207);assert.equal(result.at(-1)?.id,"00001206");
 assert.deepEqual(db.events.map(x=>x.range),[[0,499],[500,999],[1000,1499]]);
 assert.ok(db.events.every(x=>x.table==="study_attempts"&&x.order==="id"
   &&x.eq.some(([k,v])=>k==="user_id"&&v===owner)));
});
test("owner/course/question and independence filters deny cross-owner and unrelated practice",async()=>{
 const data=[...rows(3),{...rows(1)[0],id:"foreign",independence:"hint_1"},
   {...rows(1)[0],id:"othercourse",course_id:"courseB"},
   {...rows(1)[0],id:"otherquestion",question_id:"q2"}];
 const db=mockDb(data);const result=await readPagedIndependentAttempts(db,owner,["courseA"],["q1"]);
 assert.equal(result.length,3);
 assert.equal(await readPagedIndependentAttempts(db,"",["courseA"],["q1"]).then(x=>x.length),0);
});
test("bounded ID batches avoid oversized query URLs and preserve all disjoint attempts",async()=>{
 const questions=Array.from({length:45},(_,i)=>"q"+i);
 const data=questions.map((q,i)=>({...rows(1,q)[0],id:String(i).padStart(8,"0")}));
 const db=mockDb(data);const result=await readPagedIndependentAttempts(db,owner,["courseA"],questions);
 assert.equal(result.length,45);
 assert.equal(db.events.length,2);
 assert.ok(db.events.every(e=>e.groups.find(([k])=>k==="question_id")![1].length<=40));
});
test("missing server rows, read permissions and incomplete pagination must fail closed",async()=>{
 for(const options of [{fail:true},{malformed:true}]){
   await assert.rejects(readPagedIndependentAttempts(mockDb(rows(1),options),owner,["courseA"],["q1"]),FirstWeekPagingError);
 }
 const tooMany=mockDb(rows(PROOF_MAX_ROWS));
 await assert.rejects(readPagedIndependentAttempts(tooMany,owner,["courseA"],["q1"]),
   (e:unknown)=>e instanceof FirstWeekPagingError&&e.code==="first_week_proof_limit");
 assert.equal(PROOF_PAGE_SIZE,500);
});
test("full shared-owner local queue remains intact and visibly warns rather than claiming empty",()=>{
 const full=raw(Array.from({length:100},(_,i)=>({ownerId:i%2?owner:other,clientId:"id"+i})));
 const custody=inspectOfflineCustody(full,owner,owner);
 assert.equal(custody.status,"ready");assert.equal(custody.total,100);
 assert.equal(custody.owned,50);assert.equal(custody.otherOwner,50);
 assert.equal(custody.atCapacity,true);assert.equal(custody.canRetry,true);
 assert.ok(custody.storageBytes>0);
 assert.match(offlineCustodyExplanation(custody),/queue is full/i);
});
test("malformed, oversized and legacy queue evidence is never treated as safe to replay",()=>{
 for(const fragment of ["{truncated",JSON.stringify([{ownerId:owner},null]),
   JSON.stringify(Array.from({length:101},()=>({ownerId:owner}))),"x".repeat(6*1024*1024)]){
   const entry=raw();entry[OFFLINE_QUEUE_KEYS[0]]=fragment;
   const x=inspectOfflineCustody(entry,owner,owner);
   assert.equal(x.status,"malformed");assert.equal(x.canRetry,false);
 }
 const legacy=inspectOfflineCustody(raw([{ownerId:"  "},{ownerId:owner}]),owner,owner);
 assert.equal(legacy.status,"legacy_unowned");assert.equal(legacy.canRetry,false);
});
const source=(p:string)=>readFileSync(new URL(p,import.meta.url),"utf8");
test("actual setup proof fetch uses bounded pagination, not fixed 1000 rows",()=>{
 const proof=source("../src/lib/study/first-week-proof-data.ts");
 assert.match(proof,/readPagedIndependentAttempts\(/);
 assert.doesNotMatch(proof,/\.limit\(1000\)/);
});
test("global background sync blocks unsafe queues, preserves owner checks, and exposes recovery UI",()=>{
 const bridge=source("../src/components/study-sync-bridge.tsx");
 assert.match(bridge,/inspectOfflineCustody\(/);
 assert.match(bridge,/!inspect\(startingOwner\)\.canRetry/);
 assert.match(bridge,/inProgress\.current/);
 assert.match(bridge,/aria-live="polite"/);
 assert.match(bridge,/account\/recovery/);
 const account=source("../src/components/account-offline-recovery.tsx");
 assert.match(account,/custody\.atCapacity/);
 assert.match(account,/Do not clear this storage/);
});
