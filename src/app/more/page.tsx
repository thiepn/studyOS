import Link from "next/link";
import { AcademicPageHeading } from "@/components/academic-ui";
import { MORE_SECTIONS } from "@/lib/study/more-navigation";

export default function MorePage(){
  return <main className="shell more-shell">
    <AcademicPageHeading eyebrow="Your workspace" title="Settings & tools" detail="Connections, your account, and the tools you use less often." />
    <div className="settings-shortcuts"><Link href="/progress">Learning progress →</Link><Link href="/account/connections">Drive & Calendar connections →</Link><Link href="/account">Account and sign-out →</Link></div>
    <div className="more-directory">
      {[...MORE_SECTIONS].sort((a,b)=>(a.title==="Settings"?0:a.title==="Semester"?1:2)-(b.title==="Settings"?0:b.title==="Semester"?1:2)).map(section=><section key={section.title} className="more-section" aria-label={section.title}>
        <div className="more-section-head"><h2>{section.title}</h2><p>{section.description}</p></div>
        <div className="more-section-links">
          {section.entries.filter(entry=>entry.href!=="/account"&&entry.href!=="/setup").map(entry=><Link prefetch={false} href={entry.href} key={entry.href} className="more-entry">
            <span><strong>{entry.label}</strong><small>{entry.description}</small></span>
            <span aria-hidden="true">↗</span>
          </Link>)}
        </div>
      </section>)}
    </div>
  </main>;
}
