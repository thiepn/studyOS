"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CurrentCapacity } from "@/lib/study/planning";
import type { PlanningMode } from "@/lib/study/planner";

const MODES:{mode:Exclude<PlanningMode,"custom">;label:string;description:string}[]=[
  {mode:"normal",label:"Normal",description:"Default bounded study day"},
  {mode:"light",label:"Light",description:"Reduced workload and review"},
  {mode:"recovery",label:"Recovery",description:"Protect continuity; defer heavy optional work"},
  {mode:"intensive",label:"Intensive",description:"Extra capacity without changing priorities"},
];

export function CapacityControls({capacity,defaultMode}:{capacity:CurrentCapacity;defaultMode:Exclude<PlanningMode,"custom">}){
  const router=useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState<string|null>(null);
  const [custom,setCustom]=useState(Number(capacity.custom_budget_minutes??90));

  async function setMode(mode:PlanningMode,customBudgetMinutes?:number){
    setBusy(true);setMessage(null);
    try{
      const response=await fetch("/api/study/planning/capacity",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode,customBudgetMinutes})});
      const body=await response.json(); if(!response.ok) throw new Error(body?.error||"Could not update today");
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not update today");}
    finally{setBusy(false);}
  }

  async function saveSettings(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); const fd=new FormData(event.currentTarget); setBusy(true);setMessage(null);
    try{
      const response=await fetch("/api/study/planning/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        normalBudgetMinutes:Number(fd.get("normal")),lightBudgetMinutes:Number(fd.get("light")),
        recoveryBudgetMinutes:Number(fd.get("recovery")),intensiveBudgetMinutes:Number(fd.get("intensive")),
        lightReviewBudgetMinutes:Number(fd.get("lightReview")),recoveryReviewBudgetMinutes:Number(fd.get("recoveryReview")),
        maxFocusItems:Number(fd.get("maxFocus")),recoveryMaxFocusItems:Number(fd.get("recoveryMax")),defaultMode:String(fd.get("defaultMode")),
      })});
      const body=await response.json(); if(!response.ok) throw new Error(body?.error||"Could not save planning settings");
      setMessage("Planning defaults updated."); router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Could not save planning settings");}
    finally{setBusy(false);}
  }

  return <section className="panel capacity-panel">
    <div className="section-heading"><div><p className="eyebrow">Daily capacity</p><h2>{capacity.mode.replace("_"," ")} mode</h2></div><span>{capacity.total_budget_minutes} min</span></div>
    <div className="capacity-mode-grid">{MODES.map((item)=>{
      const selected=capacity.mode===item.mode;
      const minutes=item.mode==="normal"?capacity.normal_budget_minutes:item.mode==="light"?capacity.light_budget_minutes:item.mode==="recovery"?capacity.recovery_budget_minutes:capacity.intensive_budget_minutes;
      return <button key={item.mode} type="button" className={selected?"capacity-mode selected":"capacity-mode"} disabled={busy} onClick={()=>void setMode(item.mode)}>
        <strong>{item.label}</strong><span>{minutes} min</span><small>{item.description}</small>
      </button>;
    })}</div>
    <div className="custom-capacity"><label><span>Custom today</span><input type="number" min="15" max="720" step="5" value={custom} onChange={(e)=>setCustom(Number(e.target.value))}/><small>min</small></label><button className="secondary-button button-reset" type="button" disabled={busy||custom<15||custom>720} onClick={()=>void setMode("custom",custom)}>Use custom</button></div>
    {capacity.mode==="recovery"?<p className="recovery-note">Recovery Mode caps review at {capacity.effective_review_budget_minutes} minutes, allows at most {capacity.effective_max_focus_items} focus items, and defers heavy optional work. Nothing deferred becomes extra “debt minutes” tomorrow.</p>:null}
    <details className="planning-settings"><summary>Planning defaults</summary>
      <form onSubmit={saveSettings}>
        <div className="planning-settings-grid">
          <label><span>Normal</span><input name="normal" type="number" min="15" max="720" defaultValue={capacity.normal_budget_minutes}/><small>min</small></label>
          <label><span>Light</span><input name="light" type="number" min="15" max="720" defaultValue={capacity.light_budget_minutes}/><small>min</small></label>
          <label><span>Recovery</span><input name="recovery" type="number" min="15" max="720" defaultValue={capacity.recovery_budget_minutes}/><small>min</small></label>
          <label><span>Intensive</span><input name="intensive" type="number" min="15" max="720" defaultValue={capacity.intensive_budget_minutes}/><small>min</small></label>
          <label><span>Light review cap</span><input name="lightReview" type="number" min="5" max="120" defaultValue={capacity.light_review_budget_minutes}/><small>min</small></label>
          <label><span>Recovery review cap</span><input name="recoveryReview" type="number" min="5" max="120" defaultValue={capacity.recovery_review_budget_minutes}/><small>min</small></label>
          <label><span>Max focus items</span><input name="maxFocus" type="number" min="1" max="12" defaultValue={capacity.max_focus_items}/></label>
          <label><span>Recovery max</span><input name="recoveryMax" type="number" min="1" max="6" defaultValue={capacity.recovery_max_focus_items}/></label>
          <label><span>Default mode</span><select name="defaultMode" defaultValue={defaultMode}>{MODES.map((item)=><option key={item.mode} value={item.mode}>{item.label}</option>)}</select></label>
        </div>
        <button className="secondary-button button-reset" type="submit" disabled={busy}>Save defaults</button>
      </form>
    </details>
    {message?<p className="form-message" role="status">{message}</p>:null}
  </section>;
}
