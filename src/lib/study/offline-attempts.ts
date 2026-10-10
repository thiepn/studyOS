"use client";

import type { AttemptInput } from "./types";
import { readStudyMutationResponse,StudySyncError } from "./sync-response";
import { currentPendingOwner,canReplayPending } from "./pending-owner";
import {ownerMatchesBeforeOrAfterAck} from "./owner-replay-guard";
import {appendOwnerPending,sameOfflineOwner} from "./offline-queue-custody";
import {hasPersistedOfflineReceipt} from "./offline-receipt-client";
import {withOfflineReplayGuard} from "./offline-replay-guard";

const KEY = "semester-os:pending-attempts:v2";
const CHANGE_EVENT = "semester-os:sync-changed";

export type PendingAttempt = AttemptInput & { clientId: string; queuedAt: string; ownerId?: string };

function storageAvailable() { return typeof window !== "undefined" && typeof localStorage !== "undefined"; }
function changed() { if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT)); }

export function listPendingAttempts(ownerId?:string): PendingAttempt[] {
  if (!storageAvailable()) return [];
  try { const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    if(!Array.isArray(value))return [];
    return ownerId?value.filter(item=>canReplayPending(item?.ownerId,ownerId)):value; }
  catch { return []; }
}

export function enqueueAttempt(input: AttemptInput, ownerId: string): PendingAttempt {
  const clientRequestId = input.clientRequestId ?? crypto.randomUUID();
  const pending: PendingAttempt = { ...input, ownerId, clientRequestId, completedAt: input.completedAt ?? new Date().toISOString(), clientId: clientRequestId, queuedAt: new Date().toISOString() };
  const stored=localStorage.getItem(KEY);
  const updated=appendOwnerPending<PendingAttempt>(stored,pending,row=>row.clientId,100);
  localStorage.setItem(KEY, JSON.stringify(updated));
  changed();
  return pending;
}

export function removePendingAttempt(clientId:string,ownerId?:string,expectedQueuedAt?:string):boolean{
  if(!storageAvailable()||!ownerId||!expectedQueuedAt)return false;
  const before=listPendingAttempts();
  const matching=before.filter(item=>item.ownerId===ownerId&&item.clientId===clientId);
  if(matching.length!==1||matching[0].queuedAt!==expectedQueuedAt)return false;
  localStorage.setItem(KEY,JSON.stringify(before.filter(item=>item!==matching[0])));
  changed();
  return true;
}

async function postAttempt(attempt: AttemptInput) {
  const {ownerId: _owner,clientId: _client,queuedAt: _queued,...body}=attempt as PendingAttempt;
  return fetch("/api/study/attempt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export async function submitAttemptWithFallback(input: AttemptInput) {
  const ownerId=await currentPendingOwner();
  if(!ownerId)throw new StudySyncError("Sign in before submitting or preserving this attempt.",true,true);
  const normalized: AttemptInput = { ...input, clientRequestId: input.clientRequestId ?? crypto.randomUUID(), completedAt: input.completedAt ?? new Date().toISOString() };
  let responseData:unknown;
  try {
    const response = await postAttempt(normalized);
    responseData=await readStudyMutationResponse(response);
  } catch(error){
    if(error instanceof StudySyncError && error.permanent)throw error;
    if(!sameOfflineOwner(ownerId,await currentPendingOwner()))
      throw new StudySyncError("Account changed during submission. Check the original account's history; the attempt was not queued under another owner.",true,true);
    const pending=enqueueAttempt(normalized,ownerId);
    return {ok:true as const,queued:true as const,data:null,pending};
  }
  if(!sameOfflineOwner(ownerId,await currentPendingOwner()))
    throw new StudySyncError("Account changed before confirming the saved answer. Recheck the original account's history; no cross-account retry was queued.",true,true);
  return {ok:true as const,queued:false as const,data:responseData};
}

export async function flushPendingAttempts() {
  const ownerId=await currentPendingOwner();
  if(!ownerId)return [];
  return await withOfflineReplayGuard("owner-"+ownerId,async()=>{
    const queue=listPendingAttempts(ownerId);
    const results: { clientId: string; ok: boolean }[] = [];
    for(const attempt of queue){
      try{
        if(!await ownerMatchesBeforeOrAfterAck(ownerId,attempt.ownerId,currentPendingOwner))break;
        if(!attempt.clientRequestId||attempt.clientRequestId!==attempt.clientId||!attempt.questionId)
          throw new Error("Legacy or mismatched attempt identity requires manual recovery.");
        const receipt={kind:"attempt" as const,recordId:attempt.clientId,questionId:attempt.questionId};
        // Network may have failed AFTER the original write committed.
        // Prefer persisted receipt to a duplicate POST when possible.
        const recordedBefore=await hasPersistedOfflineReceipt(receipt);
        if(!recordedBefore){
          if(!await ownerMatchesBeforeOrAfterAck(ownerId,attempt.ownerId,currentPendingOwner))break;
          const response=await postAttempt(attempt);
          await readStudyMutationResponse(response);
        }
        if(!await ownerMatchesBeforeOrAfterAck(ownerId,attempt.ownerId,currentPendingOwner))break;
        const recorded=recordedBefore||await hasPersistedOfflineReceipt(receipt);
        if(!recorded)throw new Error("Server write lacks independent read-back; retained for recovery.");
        if(!await ownerMatchesBeforeOrAfterAck(ownerId,attempt.ownerId,currentPendingOwner))break;
        // A queued item edited in another tab after the replay snapshot is
        // never removed as an acknowledgement of an older write.
        if(!removePendingAttempt(attempt.clientId,ownerId,attempt.queuedAt))
          throw new Error("Queued attempt changed since replay snapshot; retain for reconciliation.");
        results.push({clientId:attempt.clientId,ok:true});
      }catch(error){
        results.push({clientId:attempt.clientId,ok:false});
        // On uncertain evidence, stop rather than POST more queued answers.
        break;
      }
    }
    return results;
  })??[];
}

export { CHANGE_EVENT as STUDY_SYNC_CHANGE_EVENT };
