import Link from "next/link";
import { AcademicPageHeading } from "@/components/academic-ui";
import { MORE_SECTIONS } from "@/lib/study/more-navigation";

export default function MorePage(){
  return <main className="shell more-shell">
    <AcademicPageHeading eyebrow="Your workspace" title="More & settings" detail="Manage connections, your semester, and advanced study tools." />
    <p className="more-intro"><Link href="/account">Account and sign-out →</Link></p>
    <div className="more-directory">
      {[...MORE_SECTIONS].sort((a,b)=>Number(b.title==="Settings")-Number(a.title==="Settings")).map(section=><section key={section.title} className="more-section" aria-label={section.title}>
        <div className="more-section-head"><h2>{section.title}</h2><p>{section.description}</p></div>
        <div className="more-section-links">
          {section.entries.map(entry=><Link href={entry.href} key={entry.href} className="more-entry">
            <span><strong>{entry.label}</strong><small>{entry.description}</small></span>
            <span aria-hidden="true">↗</span>
          </Link>)}
        </div>
      </section>)}
    </div>
  </main>;
}
