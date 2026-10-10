import {canReplayPending} from "./offline-owner-policy.ts";

/** Called immediately before posting and after a server reply. An owner
 * change must leave local source records in place for reconciliation. */
export async function ownerMatchesBeforeOrAfterAck(
  expectedOwner:string,
  recordOwner:string|undefined,
  readOwner:()=>Promise<string|null>,
):Promise<boolean>{
  if(!canReplayPending(recordOwner,expectedOwner))return false;
  try{return (await readOwner())===expectedOwner;}catch{return false;}
}
