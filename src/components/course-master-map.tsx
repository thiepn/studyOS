export type MasterMapSkill = {
  id: string; stable_key: string; title: string; kind: string; required_dimensions: string[]; mastery_state: string;
  next_review_at: string | null; exam_importance: number; prerequisite_importance: number; unresolved_errors: number;
  evidence?: Record<string, number>;
};

export type MasterMapTopic = {
  topic_id: string; topic_key: string; topic_title: string; topic_description: string | null;
  first_week_no: number | null; latest_source_week: number | null; skill_count: number; new_skills: number; learning_skills: number;
  fragile_skills: number; stable_skills: number; exam_ready_skills: number; unresolved_errors: number; durable_percent: number;
  source_resource_count: number; source_titles: string[]; skills: MasterMapSkill[];
};

export function CourseMasterMap({ topics }: { topics: MasterMapTopic[] }) {
  if (!topics.length) return (
    <section className="panel master-map-panel">
      <div className="section-heading"><div><p className="eyebrow">Knowledge model</p><h2>Course Master Map</h2></div><span>0</span></div>
      <p className="muted">No verified topic/skill map exists yet. It will grow from accepted source-grounded processing candidates.</p>
    </section>
  );
  const skills = topics.reduce((sum, topic) => sum + topic.skill_count, 0);
  const durable = topics.reduce((sum, topic) => sum + topic.stable_skills + topic.exam_ready_skills, 0);
  const durablePct = skills ? Math.round((durable / skills) * 100) : 0;
  return (
    <section className="panel master-map-panel">
      <div className="section-heading"><div><p className="eyebrow">Knowledge model</p><h2>Course Master Map</h2></div><span>{durablePct}%</span></div>
      <p className="muted">{topics.length} topics · {skills} atomic skills · {durable} durable. This map is built from accepted course sources, not chat history.</p>
      <div className="master-topic-list">
        {topics.map((topic) => (
          <details className="master-topic" key={topic.topic_id}>
            <summary>
              <div><strong>{topic.topic_title}</strong><span>{topic.first_week_no ? "W" + topic.first_week_no : "week ?"} · {topic.source_resource_count} source{topic.source_resource_count === 1 ? "" : "s"}</span></div>
              <div className="master-topic-score"><b>{Math.round(Number(topic.durable_percent))}%</b><span>{topic.skill_count} skills</span></div>
            </summary>
            {topic.topic_description ? <p>{topic.topic_description}</p> : null}
            <div className="week-metrics"><span>{topic.new_skills} new</span><span>{topic.learning_skills} learning</span><span>{topic.fragile_skills} fragile</span><span>{topic.stable_skills} stable</span><span>{topic.exam_ready_skills} exam-ready</span><span>{topic.unresolved_errors} errors</span></div>
            <div className="master-skill-list">
              {(topic.skills ?? []).map((skill) => (
                <article key={skill.id}><div><strong>{skill.title}</strong><span>{skill.mastery_state.replaceAll("_"," ")}</span></div><p>{skill.kind.replaceAll("_"," ")} · evidence: {(skill.required_dimensions ?? []).join(", ")} · exam {skill.exam_importance}/5</p></article>
              ))}
            </div>
            {topic.source_titles?.length ? <p className="tiny muted">Sources: {topic.source_titles.join(" · ")}</p> : null}
          </details>
        ))}
      </div>
    </section>
  );
}