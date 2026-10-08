"use client";

import type { ReviewSessionFinishInput, ReviewSessionStartInput } from "./types";
import { STUDY_SYNC_CHANGE_EVENT } from "./offline-attempts";
import { currentPendingOwner,canReplayPending } from "./pending-owner";
import { readStudyMutationResponse,StudySyncError } from "./sync-response";

const START_KEY = "semester-os:pending-session-starts:v1";
const FINISH_KEY = "semester-os:pending-session-finishes:v1";
type PendingStart=ReviewSessionStartInput&{queuedAt:string;ownerId?:string};
type PendingFinish=ReviewSessionFinishInput&{queuedAt:string;ownerId?:string};

function read<T>(key:string):T[]{
  if(typeof window==="undefined")return [];
  try{const result=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(result)?result:[];}
  catch{return [];}
}
function write<T>(key:string,items:T[]){
  if(typeof window==="undefined")return;
  localStorage.setItem(key,JSON.stringify(items));
  window.dispatchEvent(new Event(STUDY_SYNC_CHANGE_EVENT));
}
export function pendingSessionCount(ownerId?:string) {
  const starts=read<PendingStart>(START_KEY),ends=read<PendingFinish>(FINISH_KEY);
  return ownerId
    ? starts.filter(item=>canReplayPending(item.ownerId,ownerId)).length
      +ends.filter(item=>canReplayPending(item.ownerId,ownerId)).length
    : starts.length+ends.length;
}
async function post(path:string,input:ReviewSessionStartInput|ReviewSessionFinishInput){
  const {ownerId:_owner,queuedAt:_queued,...body}=input as PendingStart|PendingFinish;
  const response=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  return readStudyMutationResponse(response);
}
async function saveOffline<T extends {sessionId:string}>(key:string,input:T){
  const ownerId=await currentPendingOwner();
  if(!ownerId)throw new StudySyncError("Sign in before preserving this session offline.",true,true);
  const queue=read<T&{queuedAt:string;ownerId:string}>(key).filter(row=>row.sessionId!==input.sessionId);
  write(key,[...queue,{...input,queuedAt:new Date().toISOString(),ownerId}].slice(-20));
}
export async function startSessionWithFallback(input:ReviewSessionStartInput){
  try{
    const data=await post("/api/study/session/start",input);
    return {queued:false as const,data};
  }catch(error){
    if(error instanceof StudySyncError && error.permanent)throw error;
    await saveOffline(START_KEY,input);
    return {queued:true as const,data:null};
  }
}
export async function finishSessionWithFallback(input:ReviewSessionFinishInput){
  try{
    const data=await post("/api/study/session/finish",input);
    return {queued:false as const,data};
  }catch(error){
    if(error instanceof StudySyncError && error.permanent)throw error;
    await saveOffline(FINISH_KEY,input);
    return {queued:true as const,data:null};
  }
}
async function flushQueue<T extends {sessionId:string;ownerId?:string}>(key:string,path:string){
  const ownerId=await currentPendingOwner();
  if(!ownerId)return;
  const items=read<T>(key).filter(item=>canReplayPending(item.ownerId,ownerId));
  for(const item of items){
    try{
      await post(path,item as ReviewSessionStartInput|ReviewSessionFinishInput);
      write(key,read<T>(key).filter(row=>row.sessionId!==item.sessionId||row.ownerId!==ownerId));
    }catch(error){
      if((error instanceof StudySyncError && error.authRequired)
        ||(typeof navigator!=="undefined"&&!navigator.onLine))break;
    }
  }
}
export async function flushPendingSessionStarts(){
  await flushQueue<PendingStart>(START_KEY,"/api/study/session/start");
}
export async function flushPendingSessionFinishes(){
  await flushQueue<PendingFinish>(FINISH_KEY,"/api/study/session/finish");
}
