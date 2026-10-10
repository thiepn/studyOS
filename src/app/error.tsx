"use client";
import { StudySystemActions, StudySystemState } from "@/components/study-system-state";
export default function ErrorBoundary({error,reset}:{error:Error&{digest?:string};reset:()=>void}) {
  return <main className="shell system-state-shell studyos-system-state">
    <StudySystemState kind="error" title="This view could not be loaded."
      detail="The view could not be verified. Do not assume the last action completed. Retry the current view or return to your account to check the active workspace before repeating a change.">
      {error.digest?<small>Reference: {error.digest}</small>:null}
      <StudySystemActions retry={reset}/>
    </StudySystemState>
  </main>;
}
