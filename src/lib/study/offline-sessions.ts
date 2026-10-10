"use client";

import type { ReviewSessionFinishInput, ReviewSessionStartInput } from "./types";
import { STUDY_SYNC_CHANGE_EVENT } from "./offline-attempts";
import { currentPendingOwner,canReplayPending } from "./pending-owner";
import {ownerMatchesBeforeOrAfterAck} from "./owner-replay-guard";
import { readStudyMutationResponse,StudySyncError } from "./sync-response";
import {appendOwnerPending,sameOfflineOwner} from "./offline-queue-custody";

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
function saveOffline<T extends {sessionId:string}>(key:string,input:T,ownerId:string){
  if(!ownerId)throw new StudySyncError("Sign in before preserving this session offline.",true,true);
  const pending={...input,queuedAt:new Date().toISOString(),ownerId};
  const stored=typeof window!=="undefined"?localStorage.getItem(key):null;
  const updated=appendOwnerPending(stored,pending,row=>row.sessionId,20);
  write(key,updated);
}
async function submitSessionWithFallback(
  path:string,key:string,input:ReviewSessionStartInput|ReviewSessionFinishInput,
){
  const ownerId=await currentPendingOwner();
  if(!ownerId)throw new StudySyncError("Sign in before submitting or preserving this session.",true,true);
  let responseData:unknown;
  try{responseData=await post(path,input);}
  catch(error){
    if(error instanceof StudySyncError && error.permanent)throw error;
    if(!sameOfflineOwner(ownerId,await currentPendingOwner()))
      throw new StudySyncError("Account changed during the session request. Check the original account's history before any retry.",true,true);
    saveOffline(key,input,ownerId);
    return {queued:true as const,data:null};
  }
  if(!sameOfflineOwner(ownerId,await currentPendingOwner()))
    throw new StudySyncError("Account changed before session acknowledgement was confirmed. Check the original account's history.",true,true);
  return {queued:false as const,data:responseData};
}
export async function startSessionWithFallback(input:ReviewSessionStartInput){
  return submitSessionWithFallback("/api/study/session/start",START_KEY,input);
}
export async function finishSessionWithFallback(input:ReviewSessionFinishInput){
  return submitSessionWithFallback("/api/study/session/finish",FINISH_KEY,input);
}
async function flushQueue<T extends {sessionId:string;ownerId?:string}>(key:string,path:string){
  const ownerId=await currentPendingOwner();
  if(!ownerId)return;
  const items=read<T>(key).filter(item=>canReplayPending(item.ownerId,ownerId));
  for(const item of items){
    try{
      if(!await ownerMatchesBeforeOrAfterAck(ownerId,item.ownerId,currentPendingOwner))break;
      await post(path,item as unknown as ReviewSessionStartInput|ReviewSessionFinishInput);
      if(!await ownerMatchesBeforeOrAfterAck(ownerId,item.ownerId,currentPendingOwner))break;
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
