import { StudySystemActions, StudySystemState } from "@/components/study-system-state";
export default function NotFound(){
  return <main className="shell system-state-shell studyos-system-state">
    <StudySystemState kind="missing" title="This study page was not found."
      detail="The address may have changed, or this course or semester view is no longer available.">
      <StudySystemActions/>
    </StudySystemState>
  </main>;
}
