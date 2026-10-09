import type { ReactNode } from "react";
import { Nav } from "@/components/nav";

/** Shared semantic heading for the core StudyOS destinations. */
export function AcademicPageHeading({eyebrow,title,detail,children}:{
  eyebrow:string;title:string;detail?:string;children?:ReactNode;
}) {
  return <header className="header academic-page-heading">
    <div className="academic-page-heading__intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {detail?<p className="academic-page-heading__detail">{detail}</p>:null}
    </div>
    {children??<Nav/>}
  </header>;
}
export function AcademicSectionHeading({title,aside,id}:{
  title:string;aside?:string;id?:string;
}) {
  return <div className="academic-section-heading">
    <h2 id={id}>{title}</h2>
    {aside?<span className="academic-section-heading__aside">{aside}</span>:null}
  </div>;
}
export function AcademicEmptyState({title,detail,action}:{
  title:string;detail:string;action?:ReactNode;
}) {
  return <section className="academic-empty">
    <h2>{title}</h2>
    <p>{detail}</p>
    {action}
  </section>;
}
