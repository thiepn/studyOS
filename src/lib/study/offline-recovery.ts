/** Account-specific browser queue custody. No payloads or owner IDs leave the browser.
 * Server-side API authentication and RLS, not this presentation, authorize writes. */
export const OFFLINE_QUEUE_KEYS=[
  "semester-os:pending-attempts:v2",
  "semester-os:pending-session-starts:v1",
  "semester-os:pending-session-finishes:v1",
] as const;
export type OfflineQueueRaw=Record<(typeof OFFLINE_QUEUE_KEYS)[number],string|null>;
export type OfflineCustodyStatus="ready"|"owner_mismatch"|"storage_unavailable"|"malformed"|"legacy_unowned";
export type OfflineCustody={
  status:OfflineCustodyStatus;
  owned:number;
  otherOwner:number;
  unowned:number;
  total:number;
  canRetry:boolean;
  atCapacity:boolean;
  storageBytes:number;
};
const MAX_QUEUE_ENTRIES=[100,20,20] as const;
const MAX_QUEUE_BYTES=5*1024*1024;
export function inspectOfflineCustody(
  raw:OfflineQueueRaw|null,
  verifiedServerOwner:string,
  currentBrowserOwner:string|null,
):OfflineCustody{
  const denied=(status:OfflineCustodyStatus):OfflineCustody=>({status,owned:0,otherOwner:0,unowned:0,total:0,canRetry:false,atCapacity:false,storageBytes:0});
  if(!verifiedServerOwner||!currentBrowserOwner||currentBrowserOwner!==verifiedServerOwner)
    return denied("owner_mismatch");
  if(!raw)return denied("storage_unavailable");
  let owned=0,otherOwner=0,unowned=0,atCapacity=false,storageBytes=0;
  for(const [index,key] of OFFLINE_QUEUE_KEYS.entries()){
    const value=raw[key]??"[]";
    storageBytes+=value.length*2; // conservative UTF-16 storage-pressure estimate
    if(value.length>MAX_QUEUE_BYTES||storageBytes>2*MAX_QUEUE_BYTES)return denied("malformed");
    let records:unknown;
    try{records=JSON.parse(value);}catch{return denied("malformed");}
    if(!Array.isArray(records)||records.length>MAX_QUEUE_ENTRIES[index])return denied("malformed");
    if(records.length===MAX_QUEUE_ENTRIES[index])atCapacity=true;
    for(const record of records){
      if(!record||typeof record!=="object"||Array.isArray(record))return denied("malformed");
      const id=(record as {ownerId?:unknown}).ownerId;
      if(typeof id!=="string"||id.trim().length===0)unowned++;
      else if(id===verifiedServerOwner)owned++;
      else otherOwner++;
    }
  }
  return {status:unowned?"legacy_unowned":"ready",owned,otherOwner,unowned,
    total:owned+otherOwner+unowned,canRetry:unowned===0&&owned>0,atCapacity,storageBytes};
}
export function offlineCustodyExplanation(custody:OfflineCustody):string{
  switch(custody.status){
    case "owner_mismatch":return "The browser session cannot be matched to the verified THIEPN Account. Re-authenticate without replaying queued work.";
    case "storage_unavailable":return "Local browser storage is unavailable. Do not assume offline work was preserved or delivered.";
    case "malformed":return "One or more offline queues cannot be parsed safely. StudyOS will not replay them through this recovery control.";
    case "legacy_unowned":return "Older queue records without owner metadata are present. They cannot be assigned to another account or automatically replayed.";
    case "ready":return custody.atCapacity
      ? "A browser queue is full across accounts. New work cannot be safely queued; recover only under the original owner and retain a separate original copy. Server receipt still requires independent confirmation."
      : custody.owned
      ? "Only records explicitly tagged for this verified account may be retried. A matching authenticated database receipt is required before removing each local item; independently review course history."
      : "No pending local records are tagged for this account. This does not independently prove server receipt.";
  }
}
