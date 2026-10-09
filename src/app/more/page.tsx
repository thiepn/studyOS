import Link from "next/link";
import { Nav } from "@/components/nav";
import { MORE_SECTIONS } from "@/lib/study/more-navigation";

export default function MorePage(){
  return <main className="shell more-shell">
    <header className="header">
      <div><p className="eyebrow">StudyOS / Index</p><h1>More</h1></div>
      <Nav/>
    </header>
    <p className="more-intro">Planning, materials, exam operations, and semester tools. These do not need a permanent place in your daily study view. <Link href="/account">View account and sign-out options →</Link></p>
    <div className="more-directory">
      {MORE_SECTIONS.map(section=><section key={section.title} className="more-section" aria-label={section.title}>
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
