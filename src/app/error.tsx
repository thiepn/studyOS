"use client";
import { StudySystemActions, StudySystemState } from "@/components/study-system-state";
export default function ErrorBoundary({error,reset}:{error:Error&{digest?:string};reset:()=>void}) {
  return <main className="shell system-state-shell studyos-system-state">
    <StudySystemState kind="error" title="This view could not be loaded."
      detail="The view could not be retrieved. Your previously saved study data was not changed by this error. Retry, or return to your courses.">
      {error.digest?<small>Reference: {error.digest}</small>:null}
      <StudySystemActions retry={reset}/>
    </StudySystemState>
  </main>;
}
