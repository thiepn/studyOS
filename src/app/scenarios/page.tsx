import { Nav } from "@/components/nav";
import { ScenarioPlanner } from "@/components/scenario-planner";
import { getSemesterScenarioData } from "@/lib/study/scenario-data";

export const dynamic="force-dynamic";

export default async function ScenariosPage(){
  const data=await getSemesterScenarioData();
  return <main className="shell">
    <header className="header"><div><p className="eyebrow">P18 · capacity trade-offs</p><h1>Semester scenarios</h1></div><Nav /></header>
    <section className="panel scenario-intro">
      <h2>Fixed time, explicit trade-offs</h2>
      <p>P18 never creates extra study time. It reserves mandatory commitments and retention first, protects minimum course floors where possible, then allocates remaining minutes by marginal value with diminishing returns.</p>
      <small>{data.calendarConnected?"Calendar free time is constraining this week’s ceiling.":"No connected Calendar cap is active; the configured StudyOS planning budget defines the weekly ceiling."}{data.calendarStale?" Calendar data is stale, so treat the capacity estimate cautiously.":""}</small>
    </section>
    <ScenarioPlanner data={data}/>
  </main>;
}
