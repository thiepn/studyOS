/** Fail-closed mutation of browser-local queues shared by multiple owners.
 * Browser storage is not server authorization and must never imply delivery.
 * Preserve all unrelated, foreign and legacy-unowned records; never evict to
 * fit a newly queued record or erase malformed storage on a parse failure. */
export function appendOwnerPending<T extends {ownerId?:string}>(
  stored:string|null,
  incoming:T,
  identity:(record:T)=>string,
  maxRecords:number,
):T[]{
  if(typeof incoming.ownerId!=="string"||!incoming.ownerId.trim())
    throw new Error("Offline owner identity is unavailable; no work was queued.");
  if(!Number.isSafeInteger(maxRecords)||maxRecords<=0)throw new Error("Invalid local queue limit");
  let parsed:unknown;
  try{parsed=stored==null?[]:JSON.parse(stored);}
  catch{throw new Error("Stored offline queue is malformed. Preserve browser data and inspect recovery.");}
  if(!Array.isArray(parsed)||parsed.length>maxRecords||parsed.some(x=>!x||typeof x!=="object"||Array.isArray(x)))
    throw new Error("Stored offline queue cannot be safely modified. Use account recovery.");
  const owner=incoming.ownerId,key=identity(incoming);
  if(!key||typeof key!=="string")throw new Error("Missing offline record identity");
  const records=parsed as T[];
  const matches=records.filter(row=>row.ownerId===owner&&identity(row)===key);
  // Identical owner+identity retries are an update; different owners with
  // the same request/session ID must never replace each other's evidence.
  if(matches.length>1)throw new Error("Duplicate offline record identities need manual review.");
  const retained=records.filter(row=>!(row.ownerId===owner&&identity(row)===key));
  if(retained.length>=maxRecords)throw new Error("Offline queue is full. No existing study work was removed.");
  return [...retained,incoming];
}

/** A response or retry path crossing account identity cannot be claimed
 * delivered or queued under the subsequently signed-in account. */
export function sameOfflineOwner(original:string|null,current:string|null):boolean{
  return Boolean(original&&current&&original===current);
}
