import Link from "next/link";
import { Nav } from "@/components/nav";
import { ScenarioPlanner } from "@/components/scenario-planner";
import { getSemesterScenarioData } from "@/lib/study/scenario-data";

export const dynamic="force-dynamic";

export default async function ScenariosPage(){
  const data=await getSemesterScenarioData();
  return <main className="shell">
    <header className="header"><div><p className="eyebrow">Weekly planning</p><h1>Semester scenarios</h1></div><Nav /></header>
    <section className="panel scenario-intro">
      <h2>Fixed time, explicit trade-offs</h2>
      <p>Scenarios never create extra study time. Mandatory commitments and retention are reserved first; remaining capacity is compared across feasible course allocations.</p>
      <small>{data.calendarConnected?"Calendar free time is constraining this week’s ceiling.":"No connected Calendar cap is active; the configured StudyOS planning budget defines the weekly ceiling."}{data.calendarStale?" Calendar data is stale, so treat the capacity estimate cautiously.":""}</small>
      <div className="button-row"><Link className="primary-button" href="/week">Commit a weekly plan</Link></div>
    </section>
    <ScenarioPlanner data={data}/>
  </main>;
}
