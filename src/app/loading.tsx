import { StudySystemState } from "@/components/study-system-state";
export default function Loading(){
  return <main className="shell system-state-shell studyos-system-state" aria-busy="true">
    <StudySystemState kind="loading" title="Opening your study workspace…"
      detail="Loading the current semester, academic records and study plan."/>
  </main>;
}
