import type { ReactNode } from "react";
import Link from "next/link";

export function StudySystemState({kind,title,detail,children}:{
  kind:"loading"|"error"|"missing";title:string;detail:string;children?:ReactNode;
}) {
  return <section className={"system-state studyos-system-content studyos-system-"+kind}
    aria-labelledby="studyos-state-title"
    {...(kind==="error"?{role:"alert"}:kind==="loading"?{"aria-live":"polite" as const}:{"aria-live":"off" as const})}>
    <span className="section-kicker">StudyOS / {kind==="missing"?"Not found":kind}</span>
    <h1 id="studyos-state-title">{title}</h1>
    <p>{detail}</p>
    {kind==="loading"?<div className="state-progress" aria-hidden="true"><i/></div>:null}
    <div className="button-row">{children}</div>
  </section>;
}
export function StudySystemActions({retry}:{retry?:()=>void}) {
  return <>
    {retry?<button type="button" className="primary-button button-reset" onClick={retry}>Retry loading</button>:null}
    <Link href="/" className={retry?"secondary-button":"primary-button"}>Today</Link>
    <Link href="/courses" className="secondary-button">Courses</Link>
  </>;
}
