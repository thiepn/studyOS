"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@/lib/study/connection-recovery";

export function ConnectionActions({service,connected}:{service:Service;connected:boolean}) {
  const router=useRouter();
  const [confirm,setConfirm]=useState<"switch"|"disconnect"|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const label=service==="drive"?"Drive":"Calendar";
  const endpoint=`/api/integrations/google-${service}`;
  async function disconnect(){
    setBusy(true);setMessage(null);
    try{
      const response=await fetch(endpoint+"/disconnect",{method:"POST",headers:{"content-type":"application/json","x-studyos-action":"disconnect"}});
      const body=await response.json().catch(()=>({}));
      if(!response.ok||body.ok!==true)throw new Error(body.error||"Could not disconnect.");
      router.refresh();setConfirm(null);setMessage("StudyOS authorization disconnected. Your Google files and academic history remain intact.");
    }catch(e){setMessage(e instanceof Error?e.message:"Disconnect failed.");}
    finally{setBusy(false);}
  }
  if(!connected) return <div className="button-row">
    <a className="primary-button" href={endpoint+"/start"}>Connect {label}</a>
    <span className="muted tiny">Google may ask you to choose an account and grant permission.</span>
  </div>;
  return <div className="study-connection-actions">
    {!confirm?<div className="button-row">
      <a className="secondary-button" href={endpoint+"/start"}>Reconnect same {label} account</a>
      <button type="button" className="secondary-button button-reset" onClick={()=>setConfirm("switch")}>Switch {label} account</button>
      <button type="button" className="secondary-button button-reset" onClick={()=>setConfirm("disconnect")}>Disconnect {label}</button>
    </div>:<div className="study-connection-confirm">
      <strong>{confirm==="switch"?"Confirm a different Google account":"Disconnect the authorization?"}</strong>
      <p>{confirm==="switch"
        ? "Only this StudyOS integration changes. Existing Drive folders and academic records are not transferred or deleted. Calendar switches are blocked until committed study blocks are resolved."
        : "StudyOS will stop accessing this Google service. Existing source files and your academic history will not be deleted; calendar blocks must be resolved before disconnecting."}</p>
      <div className="button-row">
        {confirm==="switch"?<form method="post" action="/api/study/account/prepare-switch">
          <input type="hidden" name="service" value={service}/>
          <button type="submit" className="primary-button button-reset">Continue to Google chooser</button>
        </form>:<button type="button" disabled={busy} onClick={()=>void disconnect()} className="primary-button button-reset">{busy?"Disconnecting…":"Confirm disconnect"}</button>}
        <button type="button" disabled={busy} className="secondary-button button-reset" onClick={()=>{setConfirm(null);setMessage(null);}}>Keep connection</button>
      </div>
    </div>}
    {message?<p role="status" className="form-message">{message}</p>:null}
  </div>;
}
