import { StudySystemActions, StudySystemState } from "@/components/study-system-state";
export default function NotFound(){
  return <main className="shell system-state-shell studyos-system-state">
    <StudySystemState kind="missing" title="This study page was not found."
      detail="The requested page was not found or is not available to this session. Check the active semester, your account, or the course link without assuming another person’s records are visible.">
      <StudySystemActions/>
    </StudySystemState>
  </main>;
}
