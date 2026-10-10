"use client";

import { useState, type FormEvent } from "react";
import { MathContent } from "@/components/math-content";

type Message = { role: "user" | "assistant"; content: string };
type Source = { title: string; url: string | null };

export function StudyAssistant({ courses, initialCourseId, enabled=false }: { courses: { id: string; name: string }[]; initialCourseId?: string; enabled?:boolean }) {
  const [courseId, setCourseId] = useState(courses.some((course) => course.id === initialCourseId) ? initialCourseId! : "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sources, setSources] = useState<Source[]>([]);

  async function send(next: Message[]) {
    if (busy || !enabled) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/study/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ courseId: courseId || undefined, messages: next }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "The assistant could not answer.");
      const answer: Message = { role: "assistant", content: result.answer };
      setMessages([...next, answer].slice(-8));
      setSources(result.context?.sources ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The assistant could not answer."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || busy || !enabled) return;
    const next = [...messages, { role: "user" as const, content: question }].slice(-8);
    setMessages(next); setDraft("");
    await send(next);
  }

  function newConversation() { setMessages([]); setDraft(""); setError(""); setSources([]); }

  return <section className="panel study-assistant" aria-label="Study Assistant">
    {!enabled?<p className="assistant-paused" role="status"><strong>AI replies are paused.</strong> API spending has not been enabled. Your courses and practice remain available.</p>:null}
    <div className="assistant-toolbar"><label htmlFor="assistant-course">Course context</label><select id="assistant-course" value={courseId} onChange={(event) => { setCourseId(event.target.value); newConversation(); }}>
      <option value="">General study question</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
    </select><button type="button" className="secondary-button" onClick={newConversation} disabled={!messages.length && !error}>New conversation</button></div>
    {messages.length ? <div className="assistant-messages" aria-live="polite" aria-relevant="additions">
      {messages.map((message, index) => <article className={`assistant-message assistant-${message.role}`} key={`${index}-${message.role}`}><strong>{message.role === "user" ? "You" : "Study Assistant"}</strong>{message.content.split(/(```[\s\S]*?```)/g).map((part,i)=>part.startsWith("```")?<pre key={i}><code>{part.slice(3,-3).replace(/^[\w+-]*\n/,"")}</code></pre>:<MathContent key={i} text={part}/>)}</article>)}
      {busy ? <p className="assistant-loading" role="status">Thinking…</p> : null}
    </div> : <div className="assistant-empty"><h2>What are you working on?</h2><p>Ask for an explanation, a proof outline, a practice hint, or a short self-test. When a course is selected, StudyOS sends its approved course map and verified source titles with your question.</p></div>}
    {sources.length ? <div className="assistant-sources"><strong>Verified sources listed in this course</strong><ul>{sources.map((source, index) => <li key={`${source.title}-${index}`}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : source.title}</li>)}</ul><p>Full PDF text is not available to the assistant yet; these titles are provenance, not quoted passages.</p></div> : null}
    {error ? <div className="assistant-error" role="alert"><span>{error}</span><button type="button" className="secondary-button" onClick={() => void send(messages)} disabled={busy}>Retry last question</button></div> : null}
    <form className="assistant-form" onSubmit={submit}><label htmlFor="assistant-question">Your question</label><textarea id="assistant-question" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} rows={3} placeholder="Ask a question or request a hint…" disabled={busy || !enabled} required />
      <div className="assistant-submit-row"><span>{draft.length}/4,000 · AI responses are not saved as study evidence.</span><button className="primary-button" type="submit" disabled={!enabled || busy || !draft.trim()}>{busy ? "Thinking…" : "Ask assistant"}</button></div>
    </form>
  </section>;
}
