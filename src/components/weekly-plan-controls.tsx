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

export function WeeklyPlanControls({
  activePlanId,
  baselineCapacityMinutes,
  defaultObjective,
  canRebalance,
}:{
  activePlanId:string|null;
  baselineCapacityMinutes:number;
  defaultObjective:ScenarioObjective;
  canRebalance:boolean;
}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [objective,setObjective]=useState<ScenarioObjective>(defaultObjective);
  const [capacity,setCapacity]=useState(Math.max(0,baselineCapacityMinutes));
  const [confirmCancel,setConfirmCancel]=useState(false);
  const [confirmRebalance,setConfirmRebalance]=useState(false);

  async function post(path:string,body:Record<string,unknown>){
    setBusy(true);setMessage(null);
    try{
      const response=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error||"Could not update weekly plan");
      setConfirmCancel(false);setConfirmRebalance(false);
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Could not update weekly plan");
    }finally{setBusy(false);}
  }

  if(activePlanId){
    return <div className="week-plan-controls">
      {canRebalance?<div className="week-plan-action">
        <p className="week-confirm-note">Rolling reallocation is a proposal. The committed course minutes change only after you approve it.</p>
        <label className="week-confirm-label">
          <input type="checkbox" checked={confirmRebalance} disabled={busy}
            onChange={event=>setConfirmRebalance(event.target.checked)} />
          <span>I reviewed the proposed allocation changes and authorize applying them to my weekly plan.</span>
        </label>
        <button className="primary-button button-reset" type="button" disabled={busy||!confirmRebalance}
          onClick={()=>void post("/api/study/week-plan/rebalance",{planId:activePlanId})}>Apply reviewed rebalance</button>
      </div>:null}
      <details className="week-plan-cancellation">
        <summary>Cancel existing weekly commitment</summary>
        <p className="week-confirm-note">Canceling the weekly commitment affects StudyOS's planning record; it does not delete your completed study evidence.</p>
        <label className="week-confirm-label">
          <input type="checkbox" checked={confirmCancel} disabled={busy}
            onChange={event=>setConfirmCancel(event.target.checked)} />
          <span>Yes, I want to cancel this weekly commitment.</span>
        </label>
        <button className="secondary-button button-reset" type="button" disabled={busy||!confirmCancel}
          onClick={()=>void post("/api/study/week-plan/cancel",{planId:activePlanId})}>Confirm cancellation</button>
      </details>
      {message?<p className="form-message" role="status" aria-live="polite">{message}</p>:null}
    </div>;
  }

  return <div className="week-plan-controls">
    <div className="week-objective-buttons">
      {(Object.keys(LABELS) as ScenarioObjective[]).map(key=><button key={key} type="button" className={objective===key?"active":""} aria-pressed={objective===key} disabled={busy} onClick={()=>setObjective(key)}>{LABELS[key]}</button>)}
    </div>
    <label className="week-capacity-input">
      <span>Commit remaining-week capacity</span>
      <input type="number" min="0" max={baselineCapacityMinutes} step="15" value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/>
      <small>min · current feasible ceiling {baselineCapacityMinutes}</small>
    </label>
    <button className="primary-button button-reset" type="button" disabled={busy||!Number.isFinite(capacity)||capacity<0||capacity>baselineCapacityMinutes} onClick={()=>void post("/api/study/week-plan/commit",{objective,capacityMinutes:capacity})}>Commit this week</button>
    {message?<p className="form-message" role="status" aria-live="polite">{message}</p>:null}
  </div>;
}
