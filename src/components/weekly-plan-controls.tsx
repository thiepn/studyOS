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

  async function post(path:string,body:Record<string,unknown>){
    setBusy(true);setMessage(null);
    try{
      const response=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok)throw new Error(result?.error||"Could not update weekly plan");
      router.refresh();
    }catch(error){
      setMessage(error instanceof Error?error.message:"Could not update weekly plan");
    }finally{setBusy(false);}
  }

  if(activePlanId){
    return <div className="week-plan-controls">
      {canRebalance?<button className="primary-button button-reset" type="button" disabled={busy} onClick={()=>void post("/api/study/week-plan/rebalance",{planId:activePlanId})}>Apply rolling rebalance</button>:null}
      <button className="secondary-button button-reset" type="button" disabled={busy} onClick={()=>void post("/api/study/week-plan/cancel",{planId:activePlanId})}>Cancel weekly commitment</button>
      {message?<p className="form-message" role="status">{message}</p>:null}
    </div>;
  }

  return <div className="week-plan-controls">
    <div className="week-objective-buttons">
      {(Object.keys(LABELS) as ScenarioObjective[]).map(key=><button key={key} type="button" className={objective===key?"active":""} disabled={busy} onClick={()=>setObjective(key)}>{LABELS[key]}</button>)}
    </div>
    <label className="week-capacity-input">
      <span>Commit remaining-week capacity</span>
      <input type="number" min="0" max={baselineCapacityMinutes} step="15" value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/>
      <small>min · current feasible ceiling {baselineCapacityMinutes}</small>
    </label>
    <button className="primary-button button-reset" type="button" disabled={busy||capacity<0||capacity>baselineCapacityMinutes} onClick={()=>void post("/api/study/week-plan/commit",{objective,capacityMinutes:capacity})}>Commit this week</button>
    {message?<p className="form-message" role="status">{message}</p>:null}
  </div>;
}
