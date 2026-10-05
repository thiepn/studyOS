import Link from "next/link";
import type { ExamBlueprintRow, ExamPaper, ExamStrategy } from "@/lib/study/exams";
import { ExamMetadataForm } from "./exam-metadata-form";

function pct(value:number|null|undefined){ return value==null?"—":Math.round(Number(value))+"%"; }
function nextActionLabel(action:string){
  const labels:Record<string,string>={
    process_past_exams:"Process past exams",add_exam_evidence:"Add another past exam",maintain_blueprint:"Keep blueprint current",
    baseline_timed_paper:"Run baseline timed paper",timed_paper:"Run timed paper",verify_solutions:"Verify solutions",
    repair_weaknesses:"Repair weak areas",mixed_exam_practice:"Do mixed exam practice",
  };
  return labels[action]??action.replaceAll("_"," ");
}

export function ExamIntelligence({papers,blueprint,strategy}:{papers:ExamPaper[];blueprint:ExamBlueprintRow[];strategy:ExamStrategy|null}){
  return <section className="panel exam-intelligence">
    <div className="section-heading"><div><p className="eyebrow">P9 exam intelligence</p><h2>Exam Blueprint</h2></div><span>{papers.length} paper{papers.length===1?"":"s"}</span></div>
    {!strategy||!papers.length ? <p className="muted">No accepted Altklausur has been mapped yet. Register/process exam PDFs as resource type <code>exam</code>; official solutions can be processed separately as <code>exam_solution</code>.</p> : <>
      <div className="exam-strategy-card">
        <div><p className="eyebrow">Next exam action</p><h3>{nextActionLabel(strategy.next_action)}</h3><p>{strategy.next_action_reason}</p></div>
        <div className="strategy-metrics">
          <span><strong>{strategy.blueprint_confidence}</strong> history confidence</span>
          <span><strong>{Math.round(Number(strategy.verified_solution_coverage_percent))}%</strong> verified solution coverage</span>
          {strategy.working_minutes_per_point!=null?<span><strong>{Number(strategy.working_minutes_per_point).toFixed(2)}</strong> working min/point</span>:null}
        </div>
      </div>

      {strategy.strategy_duration_minutes ? <div className="exam-time-plan">
        <span><strong>{strategy.first_pass_minutes}</strong> min first pass</span>
        <span><strong>{strategy.return_pass_minutes}</strong> min return pass</span>
        <span><strong>{strategy.final_check_minutes}</strong> min final check</span>
      </div> : null}

      <div className="blueprint-table-wrap"><table className="blueprint-table">
        <thead><tr><th>Topic</th><th>Past papers</th><th>Points</th><th>Exam-ready</th><th>Timed</th><th>Priority</th></tr></thead>
        <tbody>{blueprint.map((row)=><tr key={row.topic_id}>
          <td><strong>{row.topic_title}</strong>{row.unseen_in_past_exams?<small>Not seen in mapped papers — still in syllabus</small>:<small>{row.observed_exam_count}/{row.active_exam_count} weighted paper history</small>}</td>
          <td>{pct(row.weighted_occurrence_percent)}</td><td>{pct(row.weighted_points_share_percent)}</td>
          <td>{pct(row.exam_ready_percent)}</td><td>{pct(row.certified_simulation_score_percent)}</td><td><strong>{Math.round(Number(row.priority_score))}</strong></td>
        </tr>)}</tbody>
      </table></div>
    </>}

    <div className="exam-paper-list">
      {papers.map((paper)=><article className="exam-paper-card" key={paper.exam_id}>
        <div className="exam-paper-head"><div><strong>{paper.title}</strong><span>{paper.year_label??"year ?"} · {paper.duration_minutes??"?"} min · {paper.total_points??paper.question_points} pts</span></div><span className={paper.simulatable?"status-pill status-verified":"status-pill"}>{paper.simulatable?"simulation ready":"incomplete"}</span></div>
        <div className="exam-paper-metrics">
          <span>{paper.question_count} questions</span><span>{Math.round(Number(paper.verified_solution_coverage_percent))}% verified solutions</span><span>{Math.round(Number(paper.syllabus_relevance)*100)}% syllabus relevance</span>
        </div>
        <div className="button-row">
          {paper.simulatable?<Link className="primary-button" href={"/practice/exam/"+paper.exam_id}>Timed paper</Link>:null}
          <ExamMetadataForm examId={paper.exam_id} relevance={Number(paper.syllabus_relevance)} active={paper.active} notes={paper.notes} />
        </div>
      </article>)}
    </div>
  </section>;
}
