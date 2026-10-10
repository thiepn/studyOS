"use client";
/** Per-origin browser Web Locks serialize replay across participating tabs.
 * If absent, no cross-tab exclusivity is claimed; owner-scoped DB idempotency
 * and exact receipt checks remain authoritative. */
const localInflight=new Set<string>();
export async function withOfflineReplayGuard<T>(key:string,work:()=>Promise<T>):Promise<T|null>{
  if(localInflight.has(key))return null;
  const execute=async()=>{
    if(localInflight.has(key))return null;
    localInflight.add(key);
    try{return await work();}finally{localInflight.delete(key);}
  };
  if(typeof navigator!=="undefined" && navigator.locks?.request)
    return navigator.locks.request("studyos-replay-"+key,{mode:"exclusive"},execute);
  return execute();
}
