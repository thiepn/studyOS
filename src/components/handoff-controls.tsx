"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ScenarioObjective } from "@/lib/study/scenario";

const LABELS:Record<ScenarioObjective,string>={
  protect_passes:"Protect passes",
  balanced:"Balanced",
  target_performance:"Target 80+",
  exam_period:"Exam period",
};

export function HandoffControls({
  previousPlanId,
  closeAllowed,
  targetPlanActive,
  commitAllowed,
  recommendedObjective,
  recommendedCapacityMinutes,
  feasibleCapacityMinutes,
}:{
  previousPlanId:string|null;
  closeAllowed:boolean;
  targetPlanActive:boolean;
  commitAllowed:boolean;
  recommendedObjective:ScenarioObjective;
  recommendedCapacityMinutes:number;
  feasibleCapacityMinutes:number;
}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [objective,setObjective]=useState<ScenarioObjective>(recommendedObjective);
  const [capacity,setCapacity]=useState(recommendedCapacityMinutes);

  async function post(path:string,body:Record<string,unknown>){
    setBusy(true);setMessage(null);
    try{
      const response=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error||"Could not update weekly handoff");
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Could not update weekly handoff");
    }finally{setBusy(false);}
  }

  return <div className="handoff-controls">
    {previousPlanId&&closeAllowed?<button className="secondary-button button-reset" disabled={busy} type="button"
      onClick={()=>void post("/api/study/handoff/close",{planId:previousPlanId})}>Close reviewed week</button>:null}

    {!targetPlanActive&&commitAllowed?<div className="handoff-commit-box">
      <div className="handoff-objectives">
        {(Object.keys(LABELS) as ScenarioObjective[]).map(key=><button key={key} type="button" disabled={busy}
          className={objective===key?"active":""} onClick={()=>setObjective(key)}>{LABELS[key]}</button>)}
      </div>
      <label className="handoff-capacity-input">
        <span>Next-week capacity</span>
        <input type="number" min="0" max={feasibleCapacityMinutes} step="15" value={capacity}
          onChange={event=>setCapacity(Number(event.target.value))}/>
        <small>min · feasible ceiling {feasibleCapacityMinutes}</small>
      </label>
      <button className="primary-button button-reset" disabled={busy||capacity<0||capacity>feasibleCapacityMinutes} type="button"
        onClick={()=>void post("/api/study/handoff/commit",{objective,capacityMinutes:capacity})}>Commit handoff week</button>
    </div>:null}

    {targetPlanActive?<p className="handoff-status"><strong>Next week is already committed.</strong> It will become the active P19 envelope when its Monday starts.</p>:null}
    {!targetPlanActive&&!commitAllowed?<p className="handoff-status">Preview only. If a prior P19 week exists, let Sunday finish and close that review first; the normal handoff is then committed on Monday. Use <a href="/week">Week</a> for the current midweek remainder.</p>:null}
    {message?<p className="form-message" role="status">{message}</p>:null}
  </div>;
}
