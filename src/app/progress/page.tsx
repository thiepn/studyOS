import Link from "next/link";
import { AcademicPageHeading } from "@/components/academic-ui";
import { getSemesterPulse, topRiskDrivers } from "@/lib/study/pulse";
import { getSemesterCalibration } from "@/lib/study/calibration-data";
import { getSemesterLearningAnalytics } from "@/lib/study/analytics-data";
import { getCrossSemesterTransferData } from "@/lib/study/cross-semester-data";
import { courseInitials, courseToneClass } from "@/lib/study/course-visual";

export const dynamic = "force-dynamic";

export default async function ProgressPage(){
  const [pulse,calibration,learning,transfer]=await Promise.all([getSemesterPulse(),getSemesterCalibration(),getSemesterLearningAnalytics(),getCrossSemesterTransferData()]);
  const calibrationByCourse=new Map(calibration.map((item)=>[item.courseId,item.profile]));
  const learningByCourse=new Map(learning.courses.map((item)=>[item.courseId,item.analytics]));
  const sustainedDrift=learning.courses.filter((item)=>item.analytics.latestDrift.band==="drifting"||item.analytics.latestDrift.band==="critical").length;
  const transferByCourse=new Map<string,(typeof transfer.activeEvaluations)>();
  for(const item of transfer.activeEvaluations)transferByCourse.set(item.courseId,[...(transferByCourse.get(item.courseId)??[]),item]);
  const longitudinalByKey=new Map(transfer.activeProfiles.map((item)=>[item.stableKey,item]));
  return <main className="shell">
    <AcademicPageHeading eyebrow="Your learning" title="Progress" detail="Evidence of learning across this semester, not just activity counts." />

    <section className="panel progress-summary">
      <div className="section-heading"><div><p className="eyebrow">Current semester</p><h2>Learning this semester</h2></div><span>{pulse.risks.filter((c)=>c.risk_band==="at_risk"||c.risk_band==="critical").length} high-risk</span></div>
      <p className="muted">{pulse.risks.length} active course{pulse.risks.length===1?"":"s"} · {sustainedDrift} showing sustained drift. Course summaries below show the most important next evidence; detailed diagnostics remain available when needed.</p>
      <div className="button-row"><Link className="secondary-button" href="/outlook">Open semester outlook</Link></div>
    </section>

    <div className="progress-section-label"><span className="section-kicker">Course evidence</span><h2>What needs attention</h2></div>

    <section className="risk-course-list">
      {pulse.risks.map((course)=>{
        const drivers=topRiskDrivers(course,3);
        const mix=course.recommended_mix && typeof course.recommended_mix==="object" ? Object.entries(course.recommended_mix) : [];
        const calibrationProfile=calibrationByCourse.get(course.course_id);
        const learningProfile=learningByCourse.get(course.course_id);
        const driftProfile=learningProfile?.latestDrift;
        const transferProfiles=transferByCourse.get(course.course_id)??[];
        const longitudinalProfile=longitudinalByKey.get(course.stable_key);
        const leadingAdvice = (learningProfile&&(learningProfile.difficultySignal==="persistent"||learningProfile.difficultySignal==="structural"))
          ? learningProfile.recommendation
          : driftProfile&&(driftProfile.band==="drifting"||driftProfile.band==="critical")
            ? driftProfile.recommendation
            : course.tested_skills===0
              ? "Record an independent practice attempt to establish a reliable baseline."
              : drivers.length
                ? "Main pressure: "+drivers[0].label+". Review this course's outstanding work."
                : "Keep up normal retrieval and independent coursework.";
        return <article className={`panel risk-course progress-ledger ${courseToneClass(course.stable_key)}`} id={"course-"+course.course_id} key={course.course_id}>
          <div className="progress-course-spine" aria-hidden="true"><span>{courseInitials(course.short_name,course.display_name)}</span></div>
          <div className="progress-course-body">
          <div className="risk-course-head">
            <div><p className="eyebrow">{course.operating_mode.replace("_"," ")} mode</p><h2>{course.display_name}</h2></div>

          </div>

          <div className="diagnostic-grid progress-headline-metrics">
            <div><strong>{course.tested_skills}</strong><span>tested skills</span></div>
            <div><strong>{course.due_or_at_risk_skills}</strong><span>due / at risk</span></div>
            <div><strong>{course.tested_skills?Math.round(Number(course.exam_ready_percent))+"%":"Not assessed"}</strong><span>exam-ready</span></div>
          </div>

          <p className="progress-leading-advice">{leadingAdvice}</p><Link className="primary-button" href={"/practice?course="+course.course_id}>{course.due_or_at_risk_skills?"Review due questions":"Start practice"}</Link>
          <details className="progress-evidence-drawer">
            <summary><span>Evidence and diagnostics</span><small>Calibration · drift · interventions · previous semesters</small></summary>
            <div className="progress-evidence-content">            <div className="risk-score-block"><span className={"risk-badge risk-" + course.risk_band}>{course.risk_band.replace("_"," ")}</span><strong>{Math.round(Number(course.risk_score))}/100</strong></div>
          <div className="diagnostic-grid evidence-secondary">
            <div><strong>{course.overdue_7d_skills}</strong><span>7d+ overdue</span></div>
            <div><strong>{course.relearning_skills}</strong><span>relearning</span></div>
            <div><strong>{course.recent_lapse_skills}</strong><span>recent lapses</span></div>
          </div>
          {calibrationProfile ? <div className="course-calibration-strip">
            <div><span>Calibration</span><strong>{calibrationProfile.status}</strong></div>
            <div><span>Independent sample</span><strong>{calibrationProfile.independentAttempts} · {calibrationProfile.distinctSkills} skills</strong></div>
            <div><span>Accuracy</span><strong>{calibrationProfile.accuracyPercent==null?"—":calibrationProfile.accuracyPercent+"%"}</strong></div>
            <div><span>Confidence gap</span><strong>{calibrationProfile.confidenceGap==null?"—":(calibrationProfile.confidenceGap>0?"+":"")+calibrationProfile.confidenceGap+"%"}</strong></div>
            <div><span>Pace</span><strong>{calibrationProfile.paceRatio==null?"—":calibrationProfile.paceRatio.toFixed(2)+"×"}</strong></div>
            <div><span>Weak signal</span><strong>{calibrationProfile.weakDimension?.replaceAll("_"," ") ?? calibrationProfile.dominantError?.replaceAll("_"," ") ?? "not stable yet"}</strong></div>
          </div> : null}

          {driftProfile ? <div className={"course-drift-panel drift-"+driftProfile.band}>
            <div className="course-drift-head"><div><span>Multi-week drift</span><strong>{driftProfile.band.replace("_"," ")}</strong></div><b>{driftProfile.sufficientData?driftProfile.score+"/100":"collecting evidence"}</b></div>
            <div className="course-drift-metrics">
              <span><strong>{driftProfile.recentAccuracyPercent==null?"—":driftProfile.recentAccuracyPercent+"%"}</strong> recent accuracy</span>
              <span><strong>{driftProfile.accuracyDelta==null?"—":(driftProfile.accuracyDelta>0?"+":"")+driftProfile.accuracyDelta+" pp"}</strong> vs prior</span>
              <span><strong>{driftProfile.recentPracticeMinutes} / {driftProfile.priorPracticeMinutes} min</strong> practice</span>
              <span><strong>{driftProfile.workflowLagWeeks}</strong> lagged weeks</span>
              <span><strong>{driftProfile.unresolvedErrors}</strong> unresolved errors</span>
              <span><strong>{driftProfile.workloadFeedback.replace("_"," ")}</strong> workload/result</span>
            </div>
            {driftProfile.components.length?<ul>{driftProfile.components.slice(0,3).map((component)=><li key={component.key}>{component.label} <strong>+{component.points}</strong></li>)}</ul>:null}
            <p>{driftProfile.recommendation}</p>
          </div> : null}

          {learningProfile ? <div className={"course-learning-panel difficulty-"+learningProfile.difficultySignal}>
            <div className="course-learning-head">
              <div><span>Intervention validation</span><strong>{learningProfile.difficultySignal.replace("_"," ")}</strong></div>
              <b>{learningProfile.effectivenessRate==null?"—":learningProfile.effectivenessRate+"% effective"}</b>
            </div>
            <div className="course-learning-metrics">
              <span><strong>{learningProfile.totalInterventions}</strong> repairs</span>
              <span><strong>{learningProfile.evaluatedInterventions}</strong> evaluated</span>
              <span><strong>{learningProfile.effectiveInterventions}</strong> effective</span>
              <span><strong>{learningProfile.pendingInterventions}</strong> pending</span>
            </div>
            {learningProfile.interventions[0] ? <p className="latest-intervention"><strong>Latest:</strong> {learningProfile.interventions[0].outcome.replace("_"," ")} · {learningProfile.interventions[0].baselineAccuracyPercent==null?"—":learningProfile.interventions[0].baselineAccuracyPercent+"%"} → {learningProfile.interventions[0].followupAccuracyPercent==null?"—":learningProfile.interventions[0].followupAccuracyPercent+"%"} · {learningProfile.interventions[0].evidenceWindow}</p> : null}
            <p>{learningProfile.recommendation}</p>
          </div> : null}

          {transferProfiles.length ? <div className="course-learning-panel">
            <div className="course-learning-head"><div><span>Cross-semester transfer</span><strong>{transferProfiles.map((item)=>item.outcome.replaceAll("_"," ")).join(" · ")}</strong></div><b>{transferProfiles.length} prior{transferProfiles.length===1?"":"s"}</b></div>
            <div className="course-learning-metrics">
              {transferProfiles.map((item)=><span key={item.priorId}><strong>{item.sourceSignal} → {item.currentSignal}</strong> {item.relation.replace("_"," ")} · {item.confidence} confidence</span>)}
            </div>
            {transferProfiles.map((item)=><p className="latest-intervention" key={item.priorId+"-note"}><strong>{item.sourceDisplayName}:</strong> {item.recommendation} ({item.baselineClassifications} baseline classifications · {item.independentAttempts} early independent attempts)</p>)}
          </div> : null}

          {longitudinalProfile ? <div className={"course-learning-panel difficulty-"+(longitudinalProfile.pattern==="recurring_weakness"?"persistent":longitudinalProfile.pattern==="durable_strength"?"responsive":"insufficient_evidence")}>
            <div className="course-learning-head">
              <div><span>Longitudinal profile</span><strong>{longitudinalProfile.pattern.replaceAll("_"," ")}</strong></div>
              <b>{longitudinalProfile.usableTransitions} transition{longitudinalProfile.usableTransitions===1?"":"s"}</b>
            </div>
            <div className="course-learning-metrics">
              <span><strong>{longitudinalProfile.positiveConfirmations}</strong> repeated strengths</span>
              <span><strong>{longitudinalProfile.negativeConfirmations}</strong> repeated weaknesses</span>
              <span><strong>{longitudinalProfile.contradictions}</strong> contradicted priors</span>
            </div>
            <p>{longitudinalProfile.recommendation}</p>
            <p className="muted">Advisory history only. Current-semester attempts and mastery remain authoritative.</p>
          </div> : null}

          <div className="risk-detail-grid">
            <div><h3>Risk drivers</h3>{drivers.length?<ul>{drivers.map((driver)=><li key={driver.key}><span>{driver.label}</span><strong>{driver.value.toFixed(1)}</strong></li>)}</ul>:<p className="muted">No material risk signal yet.</p>}</div>
            <div><h3>Operating mix</h3><ul>{mix.map(([key,value])=><li key={key}><span>{key.replaceAll("_"," ")}</span><strong>{Number(value)}%</strong></li>)}</ul></div>
          </div>

          {calibrationProfile ? <p className="calibration-recommendation"><strong>Calibration:</strong> {calibrationProfile.recommendation}</p> : null}
            </div>
          </details>
          <p className="muted">{course.days_to_exam==null?"Exam date not configured.":course.days_to_exam>=0?String(course.days_to_exam)+" days to exam.":"Exam date has passed."} {course.actionable_backlog} actionable weekly item{course.actionable_backlog===1?"":"s"} · {course.unresolved_errors} unresolved error{course.unresolved_errors===1?"":"s"}.</p>
          <div className="button-row"><Link className="secondary-button" href={"/courses/" + course.course_id}>Open course</Link>{calibrationProfile?<Link className="secondary-button" href={"/practice?mode=calibration&course="+course.course_id}>Calibration set</Link>:null}{learningProfile&&(learningProfile.difficultySignal==="persistent"||learningProfile.difficultySignal==="structural")?<Link className="primary-button" href={"/strategy?course="+course.course_id}>Open strategy lab</Link>:null}</div>
          </div>
        </article>;
      })}
    </section>

    <details className="progress-global-drawer">
      <summary><span><strong>Methods and longitudinal evidence</strong><small>Study-method effectiveness and evidence transferred between semesters</small></span><b>Open</b></summary>
      <div className="progress-global-content">
    <section className="panel intervention-summary">
      <div className="section-heading"><div><p className="eyebrow">Intervention validation</p><h2>Are corrections actually working?</h2></div><span>{learning.summary.effectivenessRate==null?"—":learning.summary.effectivenessRate+"%"}</span></div>
      <div className="intervention-summary-grid">
        <div><strong>{learning.summary.totalInterventions}</strong><span>completed targeted repairs</span></div>
        <div><strong>{learning.summary.evaluatedInterventions}</strong><span>with enough follow-up</span></div>
        <div><strong>{learning.summary.effectiveInterventions}</strong><span>effective</span></div>
        <div><strong>{learning.summary.pendingInterventions}</strong><span>pending / insufficient evidence</span></div>
        <div><strong>{learning.summary.persistentCourses}</strong><span>persistent difficulty</span></div>
        <div><strong>{learning.summary.structuralCourses}</strong><span>structural signal</span></div>
      </div>
      <p className="muted">Repairs are judged only from later independent attempts. Performance inside the repair session itself is excluded, so the metric measures transfer rather than practice-set success.</p>
    </section>

    <section className="panel intervention-summary">
      <div className="section-heading"><div><p className="eyebrow">Cross-semester transfer</p><h2>Did historical evidence actually transfer?</h2></div><span>{transfer.summary.usable}/{transfer.summary.activePriors}</span></div>
      <div className="intervention-summary-grid">
        <div><strong>{transfer.summary.activePriors}</strong><span>active priors</span></div>
        <div><strong>{transfer.summary.usable}</strong><span>validated / mixed</span></div>
        <div><strong>{transfer.summary.confirmed}</strong><span>confirmed</span></div>
        <div><strong>{transfer.summary.partial}</strong><span>partial / mixed</span></div>
        <div><strong>{transfer.summary.contradicted}</strong><span>contradicted</span></div>
        <div><strong>{transfer.summary.insufficient}</strong><span>need evidence</span></div>
      </div>
      <div className="course-learning-metrics">
        {transfer.reliability.filter((item)=>item.total>0).map((item)=><span key={item.relation}><strong>{item.reliabilityPercent==null?"—":item.reliabilityPercent+"%"}</strong> {item.relation.replace("_"," ")} reliability · {item.usable}/{item.total} usable</span>)}
      </div>
      <p className="muted">Cross-semester validation compares immutable historical-prior signals with fresh baseline classifications and independent attempts from the first 21 days. It only calibrates how much diagnostic attention a prior deserves; it never restores mastery, schedules reviews, or overrides current-semester evidence.</p>
    </section>

      </div>
    </details>
  </main>;
}
