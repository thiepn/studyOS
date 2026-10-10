"use client";
import {assertOfflineReceiptResponse,type OfflineReceiptRequest} from "./offline-receipt-contract";
/** A genuine owner-authenticated DB read is required before a queued source
 * is removed. This does not approve the academic quality of the submission. */
export async function hasPersistedOfflineReceipt(input:OfflineReceiptRequest):Promise<boolean>{
  const response=await fetch("/api/study/offline-receipt",{
    method:"POST",headers:{"content-type":"application/json"},cache:"no-store",
    body:JSON.stringify(input),
  });
  if(response.status===401||response.status===403)throw new Error("Authentication changed; queued evidence retained.");
  let payload:unknown;
  try{payload=await response.json();}catch{throw new Error("Read-back response was not valid JSON; queued evidence retained.");}
  if(response.ok && payload && typeof payload==="object"&&!Array.isArray(payload)
    &&(payload as Record<string,unknown>).ok===true &&(payload as Record<string,unknown>).recorded===false)
    return false;
  assertOfflineReceiptResponse(response.status,payload);
  return true;
}
