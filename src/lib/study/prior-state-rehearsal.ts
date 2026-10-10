import {inspectOfflineCustody,type OfflineQueueRaw} from "./offline-recovery.ts";

/** Rehearsal is a READ-ONLY browser-local comparison, never a restore/migration.
 * No academic content, Google identities, or cross-owner record IDs are exposed. */
export type RecoveryInventory={
  ownerConfirmed:boolean;
  activeSemesterId:string|null;
  total:number;
  owned:number;
  otherOwner:number;
  unowned:number;
  recoverable:boolean;
  status:string;
};
export type RecoveryRehearsal={
  decision:"BLOCKED"|"REVIEW_REQUIRED"|"UNCHANGED";
  reasons:string[];
  canRestore:false;
  canPurge:false;
  canRelease:false;
};
export function recoveryInventory(
  raw:OfflineQueueRaw|null,verifiedOwner:string,browserOwner:string|null,activeSemesterId:string|null,
):RecoveryInventory{
  const inspected=inspectOfflineCustody(raw,verifiedOwner,browserOwner);
  return {
    ownerConfirmed:!!verifiedOwner&&browserOwner===verifiedOwner,
    activeSemesterId,
    total:inspected.total,owned:inspected.owned,otherOwner:inspected.otherOwner,
    unowned:inspected.unowned,
    recoverable:inspected.canRetry,
    status:inspected.status,
  };
}
export function rehearsePriorState(
  before:RecoveryInventory|null,after:RecoveryInventory,
):RecoveryRehearsal{
  const blocked=(reason:string):RecoveryRehearsal=>({
    decision:"BLOCKED",reasons:[reason],canRestore:false,canPurge:false,canRelease:false,
  });
  if(!before)return blocked("No prior browser-local observation exists. An actual stable backup has not been qualified.");
  if(!before.ownerConfirmed||!after.ownerConfirmed)return blocked("Owner identity cannot be verified for both observations.");
  if(before.status!=="ready"||after.status!=="ready")
    return blocked("Corrupt, legacy, unavailable or cross-account custody cannot be rehearsed as a safe restore.");
  if(before.otherOwner||after.otherOwner||before.unowned||after.unowned)
    return blocked("Mixed-owner evidence must be retained and reviewed separately.");
  if(before.activeSemesterId!==after.activeSemesterId)
    return blocked("Active semester changed. Historical records cannot automatically be mapped into another semester.");
  const reasons:string[]=[];
  if(after.owned<before.owned)reasons.push("Local records were removed; server acknowledgment and original bytes must be independently reconciled.");
  if(after.owned>before.owned)reasons.push("New local records arrived. Do not overwrite them with a prior-state copy.");
  if(after.total!==before.total)reasons.push("Browser queue inventory has changed. No automatic rollback is authorized.");
  return {decision:reasons.length?"REVIEW_REQUIRED":"UNCHANGED",
    reasons:reasons.length?reasons:["Browser-local counts match, but this cannot establish a genuine encrypted backup or remote server acknowledgment."],
    canRestore:false,canPurge:false,canRelease:false};
}
