create or replace view public.study_exam_paper_catalog
with (security_invoker=true)
as
WITH q AS (
         SELECT e_1.user_id,
            e_1.id AS exam_id,
            count(eq.id) FILTER (WHERE eq.active)::integer AS question_count,
            count(eq.id) FILTER (WHERE eq.active AND eq.study_question_id IS NOT NULL)::integer AS mapped_question_count,
            COALESCE(sum(eq.points) FILTER (WHERE eq.active), 0::numeric) AS question_points,
            COALESCE(sum(eq.points) FILTER (WHERE eq.active AND (eq.answer_status = ANY (ARRAY['verified'::study_exam_answer_status, 'official'::study_exam_answer_status]))), 0::numeric) AS verified_solution_points,
            count(eq.id) FILTER (WHERE eq.active AND eq.answer_status = 'official'::study_exam_answer_status)::integer AS official_answer_count,
            count(eq.id) FILTER (WHERE eq.active AND eq.answer_status = 'verified'::study_exam_answer_status)::integer AS verified_answer_count,
            count(eq.id) FILTER (WHERE eq.active AND eq.answer_status = 'unverified'::study_exam_answer_status)::integer AS unverified_answer_count,
            count(eq.id) FILTER (WHERE eq.active AND eq.answer_status = 'missing'::study_exam_answer_status)::integer AS missing_answer_count,
            count(eq.id) FILTER (WHERE eq.active AND (eq.points IS NULL OR eq.points <= 0::numeric OR eq.study_question_id IS NULL OR NULLIF(btrim(eq.prompt_text), ''::text) IS NULL))::integer AS incomplete_question_count
           FROM study_exams e_1
             LEFT JOIN study_exam_questions eq ON eq.user_id = e_1.user_id AND eq.exam_id = e_1.id
          GROUP BY e_1.user_id, e_1.id
        )
 SELECT e.user_id,
    e.id AS exam_id,
    e.course_id,
    e.source_resource_id,
    e.solution_resource_id,
    e.stable_key,
    e.title,
    e.exam_at,
    e.year_label,
    e.duration_minutes,
    e.total_points,
    e.official,
    e.active,
    e.syllabus_relevance,
    e.notes,
    q.question_count,
    q.mapped_question_count,
    q.question_points,
    q.official_answer_count,
    q.verified_answer_count,
    q.unverified_answer_count,
    q.missing_answer_count,
    q.incomplete_question_count,
        CASE
            WHEN COALESCE(e.total_points, q.question_points) > 0::numeric THEN round(100::numeric * q.verified_solution_points / COALESCE(e.total_points, q.question_points), 1)
            ELSE 0::numeric
        END AS verified_solution_coverage_percent,
        CASE
            WHEN e.exam_at IS NULL THEN 0.75
            WHEN e.exam_at >= (now() - '2 years'::interval) THEN 1.00
            WHEN e.exam_at >= (now() - '4 years'::interval) THEN 0.85
            WHEN e.exam_at >= (now() - '6 years'::interval) THEN 0.70
            ELSE 0.55
        END AS recency_weight,
    round(e.syllabus_relevance *
        CASE
            WHEN e.exam_at IS NULL THEN 0.75
            WHEN e.exam_at >= (now() - '2 years'::interval) THEN 1.00
            WHEN e.exam_at >= (now() - '4 years'::interval) THEN 0.85
            WHEN e.exam_at >= (now() - '6 years'::interval) THEN 0.70
            ELSE 0.55
        END, 3) AS effective_weight,
    e.active AND q.question_count > 0 AND q.incomplete_question_count = 0 AND COALESCE(e.duration_minutes, c.exam_duration_minutes) >= 10 AND COALESCE(e.duration_minutes, c.exam_duration_minutes) <= 600 AND COALESCE(e.total_points, q.question_points) > 0::numeric AS simulatable
   FROM study_exams e
     JOIN study_courses c ON c.user_id = e.user_id AND c.id = e.course_id
     JOIN q ON q.user_id = e.user_id AND q.exam_id = e.id;
revoke all on public.study_exam_paper_catalog from anon;
grant select on public.study_exam_paper_catalog to authenticated;

create or replace view public.study_exam_blueprint
with (security_invoker=true)
as
WITH primary_topic AS (
         SELECT DISTINCT ON (ts.user_id, ts.skill_id) ts.user_id,
            ts.skill_id,
            ts.topic_id
           FROM study_topic_skills ts
          ORDER BY ts.user_id, ts.skill_id, ts.is_primary DESC, ts.topic_id
        ), paper_denominator AS (
         SELECT p.user_id,
            p.course_id,
            sum(p.effective_weight) FILTER (WHERE p.active AND p.question_count > 0) AS paper_weight_total,
            count(*) FILTER (WHERE p.active AND p.question_count > 0)::integer AS active_exam_count
           FROM study_exam_paper_catalog p
          GROUP BY p.user_id, p.course_id
        ), question_fact AS (
         SELECT p.user_id,
            p.course_id,
            p.exam_id,
            p.effective_weight,
            eq.id AS exam_question_id,
            eq.primary_skill_id,
            pt.topic_id,
            COALESCE(eq.points, 1::numeric) AS points,
            COALESCE(eq.points, 1::numeric) * p.effective_weight AS weighted_points
           FROM study_exam_paper_catalog p
             JOIN study_exam_questions eq ON eq.user_id = p.user_id AND eq.exam_id = p.exam_id AND eq.active
             LEFT JOIN primary_topic pt ON pt.user_id = eq.user_id AND pt.skill_id = eq.primary_skill_id
          WHERE p.active AND p.question_count > 0 AND p.effective_weight > 0::numeric
        ), course_points AS (
         SELECT question_fact.user_id,
            question_fact.course_id,
            sum(question_fact.weighted_points) AS weighted_points_total
           FROM question_fact
          GROUP BY question_fact.user_id, question_fact.course_id
        ), topic_exam_presence AS (
         SELECT question_fact.user_id,
            question_fact.course_id,
            question_fact.topic_id,
            question_fact.exam_id,
            max(question_fact.effective_weight) AS paper_weight
           FROM question_fact
          WHERE question_fact.topic_id IS NOT NULL
          GROUP BY question_fact.user_id, question_fact.course_id, question_fact.topic_id, question_fact.exam_id
        ), topic_history AS (
         SELECT q.user_id,
            q.course_id,
            q.topic_id,
            count(DISTINCT q.exam_id)::integer AS observed_exam_count,
            count(DISTINCT q.exam_question_id)::integer AS observed_question_count,
            sum(q.weighted_points) AS weighted_points
           FROM question_fact q
          WHERE q.topic_id IS NOT NULL
          GROUP BY q.user_id, q.course_id, q.topic_id
        ), topic_presence_weight AS (
         SELECT topic_exam_presence.user_id,
            topic_exam_presence.course_id,
            topic_exam_presence.topic_id,
            sum(topic_exam_presence.paper_weight) AS observed_paper_weight
           FROM topic_exam_presence
          GROUP BY topic_exam_presence.user_id, topic_exam_presence.course_id, topic_exam_presence.topic_id
        ), topic_importance AS (
         SELECT t.user_id,
            t.course_id,
            t.id AS topic_id,
            round(avg(s.exam_importance), 2) AS avg_exam_importance
           FROM study_topics t
             JOIN study_topic_skills ts ON ts.user_id = t.user_id AND ts.topic_id = t.id
             JOIN study_skills s ON s.user_id = ts.user_id AND s.id = ts.skill_id AND s.active
          WHERE t.active
          GROUP BY t.user_id, t.course_id, t.id
        ), simulation_topic AS (
         SELECT sim.user_id,
            sim.course_id,
            pt.topic_id,
            count(*) FILTER (WHERE (i.grading_status = ANY (ARRAY['verified'::study_exam_grading_status, 'official'::study_exam_grading_status])) AND i.awarded_points IS NOT NULL)::integer AS certified_items,
            sum(i.awarded_points) FILTER (WHERE i.grading_status = ANY (ARRAY['verified'::study_exam_grading_status, 'official'::study_exam_grading_status])) AS awarded_points,
            sum(i.max_points) FILTER (WHERE i.grading_status = ANY (ARRAY['verified'::study_exam_grading_status, 'official'::study_exam_grading_status])) AS max_points
           FROM study_exam_simulations sim
             JOIN study_exam_simulation_items i ON i.user_id = sim.user_id AND i.simulation_id = sim.id
             JOIN study_exam_questions eq ON eq.user_id = i.user_id AND eq.id = i.exam_question_id
             LEFT JOIN primary_topic pt ON pt.user_id = eq.user_id AND pt.skill_id = eq.primary_skill_id
          WHERE sim.status = 'completed'::study_exam_simulation_status
          GROUP BY sim.user_id, sim.course_id, pt.topic_id
        ), base AS (
         SELECT m.user_id,
            m.course_id,
            m.semester_id,
            m.topic_id,
            m.topic_key,
            m.topic_title,
            m.skill_count,
            m.exam_ready_skills,
            m.durable_percent,
            COALESCE(pd.active_exam_count, 0) AS active_exam_count,
            COALESCE(h.observed_exam_count, 0) AS observed_exam_count,
            COALESCE(h.observed_question_count, 0) AS observed_question_count,
                CASE
                    WHEN COALESCE(pd.paper_weight_total, 0::numeric) > 0::numeric THEN round(100::numeric * COALESCE(pw.observed_paper_weight, 0::numeric) / pd.paper_weight_total, 1)
                    ELSE 0::numeric
                END AS weighted_occurrence_percent,
                CASE
                    WHEN COALESCE(cp.weighted_points_total, 0::numeric) > 0::numeric THEN round(100::numeric * COALESCE(h.weighted_points, 0::numeric) / cp.weighted_points_total, 1)
                    ELSE 0::numeric
                END AS weighted_points_share_percent,
            COALESCE(ti.avg_exam_importance, 3::numeric) AS avg_exam_importance,
                CASE
                    WHEN m.skill_count > 0 THEN round(100.0 * m.exam_ready_skills::numeric / m.skill_count::numeric, 1)
                    ELSE 0::numeric
                END AS exam_ready_percent,
            COALESCE(st.certified_items, 0) AS certified_simulation_items,
                CASE
                    WHEN COALESCE(st.max_points, 0::numeric) > 0::numeric THEN round(100::numeric * st.awarded_points / st.max_points, 1)
                    ELSE NULL::numeric
                END AS certified_simulation_score_percent
           FROM study_course_master_map m
             LEFT JOIN paper_denominator pd ON pd.user_id = m.user_id AND pd.course_id = m.course_id
             LEFT JOIN course_points cp ON cp.user_id = m.user_id AND cp.course_id = m.course_id
             LEFT JOIN topic_history h ON h.user_id = m.user_id AND h.course_id = m.course_id AND h.topic_id = m.topic_id
             LEFT JOIN topic_presence_weight pw ON pw.user_id = m.user_id AND pw.course_id = m.course_id AND pw.topic_id = m.topic_id
             LEFT JOIN topic_importance ti ON ti.user_id = m.user_id AND ti.course_id = m.course_id AND ti.topic_id = m.topic_id
             LEFT JOIN simulation_topic st ON st.user_id = m.user_id AND st.course_id = m.course_id AND st.topic_id = m.topic_id
        )
 SELECT user_id,
    course_id,
    semester_id,
    topic_id,
    topic_key,
    topic_title,
    skill_count,
    exam_ready_skills,
    durable_percent,
    active_exam_count,
    observed_exam_count,
    observed_question_count,
    weighted_occurrence_percent,
    weighted_points_share_percent,
    avg_exam_importance,
    exam_ready_percent,
    certified_simulation_items,
    certified_simulation_score_percent,
    round(35::numeric * GREATEST(weighted_occurrence_percent, weighted_points_share_percent) / 100.0, 1) AS history_component,
    round(20::numeric * avg_exam_importance / 5.0, 1) AS syllabus_importance_component,
    round(25::numeric * (100::numeric - exam_ready_percent) / 100.0, 1) AS readiness_gap_component,
    round(
        CASE
            WHEN certified_simulation_score_percent IS NULL THEN 0::numeric
            ELSE 20::numeric * (100::numeric - certified_simulation_score_percent) / 100.0
        END, 1) AS simulation_gap_component,
    round(35::numeric * GREATEST(weighted_occurrence_percent, weighted_points_share_percent) / 100.0 + 20::numeric * avg_exam_importance / 5.0 + 25::numeric * (100::numeric - exam_ready_percent) / 100.0 +
        CASE
            WHEN certified_simulation_score_percent IS NULL THEN 0::numeric
            ELSE 20::numeric * (100::numeric - certified_simulation_score_percent) / 100.0
        END, 1) AS priority_score,
        CASE
            WHEN active_exam_count = 0 THEN 'none'::text
            WHEN active_exam_count < 2 THEN 'low'::text
            WHEN active_exam_count < 4 THEN 'medium'::text
            ELSE 'high'::text
        END AS historical_confidence,
    observed_exam_count = 0 AS unseen_in_past_exams
   FROM base b;
revoke all on public.study_exam_blueprint from anon;
grant select on public.study_exam_blueprint to authenticated;

create or replace view public.study_exam_intelligence_summary
with (security_invoker=true)
as
WITH papers AS (
         SELECT study_exam_paper_catalog.user_id,
            study_exam_paper_catalog.course_id,
            count(*) FILTER (WHERE study_exam_paper_catalog.active AND study_exam_paper_catalog.question_count > 0)::integer AS processed_exams,
            count(*) FILTER (WHERE study_exam_paper_catalog.active AND study_exam_paper_catalog.simulatable)::integer AS simulatable_exams,
            COALESCE(sum(study_exam_paper_catalog.effective_weight) FILTER (WHERE study_exam_paper_catalog.active AND study_exam_paper_catalog.question_count > 0), 0::numeric) AS effective_exam_weight,
            COALESCE(sum(study_exam_paper_catalog.question_count) FILTER (WHERE study_exam_paper_catalog.active), 0::bigint)::integer AS exam_questions,
                CASE
                    WHEN sum(COALESCE(study_exam_paper_catalog.total_points, study_exam_paper_catalog.question_points)) FILTER (WHERE study_exam_paper_catalog.active AND study_exam_paper_catalog.question_count > 0) > 0::numeric THEN round(100::numeric * sum(COALESCE(study_exam_paper_catalog.total_points, study_exam_paper_catalog.question_points) * study_exam_paper_catalog.verified_solution_coverage_percent / 100.0) FILTER (WHERE study_exam_paper_catalog.active AND study_exam_paper_catalog.question_count > 0) / sum(COALESCE(study_exam_paper_catalog.total_points, study_exam_paper_catalog.question_points)) FILTER (WHERE study_exam_paper_catalog.active AND study_exam_paper_catalog.question_count > 0), 1)
                    ELSE 0::numeric
                END AS verified_solution_coverage_percent,
            percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY (study_exam_paper_catalog.duration_minutes::double precision)) FILTER (WHERE study_exam_paper_catalog.active AND study_exam_paper_catalog.duration_minutes IS NOT NULL) AS typical_duration_minutes,
            percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY (COALESCE(study_exam_paper_catalog.total_points, study_exam_paper_catalog.question_points)::double precision)) FILTER (WHERE study_exam_paper_catalog.active AND COALESCE(study_exam_paper_catalog.total_points, study_exam_paper_catalog.question_points) > 0::numeric) AS typical_total_points
           FROM study_exam_paper_catalog
          GROUP BY study_exam_paper_catalog.user_id, study_exam_paper_catalog.course_id
        ), last_sim AS (
         SELECT DISTINCT ON (s.user_id, s.course_id) s.user_id,
            s.course_id,
            s.id AS simulation_id,
            s.exam_id,
            s.completed_at,
            s.score_percent,
            s.verified_score_percent,
            s.verified_coverage_percent,
            s.time_used_seconds
           FROM study_exam_simulations s
          WHERE s.status = 'completed'::study_exam_simulation_status
          ORDER BY s.user_id, s.course_id, s.completed_at DESC
        )
 SELECT c.user_id,
    c.id AS course_id,
    c.semester_id,
    c.display_name,
    c.short_name,
    COALESCE(p.processed_exams, 0) AS processed_exams,
    COALESCE(p.simulatable_exams, 0) AS simulatable_exams,
    COALESCE(p.effective_exam_weight, 0::numeric) AS effective_exam_weight,
    COALESCE(p.exam_questions, 0) AS exam_questions,
    COALESCE(p.verified_solution_coverage_percent, 0::numeric) AS verified_solution_coverage_percent,
    p.typical_duration_minutes,
    p.typical_total_points,
        CASE
            WHEN COALESCE(p.effective_exam_weight, 0::numeric) < 1.5 THEN 'low'::text
            WHEN COALESCE(p.effective_exam_weight, 0::numeric) < 3.5 THEN 'medium'::text
            ELSE 'high'::text
        END AS blueprint_confidence,
    ls.simulation_id AS last_simulation_id,
    ls.exam_id AS last_simulation_exam_id,
    ls.completed_at AS last_simulation_at,
    ls.score_percent AS last_score_percent,
    ls.verified_score_percent AS last_verified_score_percent,
    ls.verified_coverage_percent AS last_verified_coverage_percent,
    ls.time_used_seconds AS last_time_used_seconds
   FROM study_courses c
     LEFT JOIN papers p ON p.user_id = c.user_id AND p.course_id = c.id
     LEFT JOIN last_sim ls ON ls.user_id = c.user_id AND ls.course_id = c.id
  WHERE c.active;
revoke all on public.study_exam_intelligence_summary from anon;
grant select on public.study_exam_intelligence_summary to authenticated;

create or replace view public.study_exam_strategy
with (security_invoker=true)
as
WITH btop AS (
         SELECT study_exam_blueprint.user_id,
            study_exam_blueprint.course_id,
            jsonb_agg(jsonb_build_object('topic_id', study_exam_blueprint.topic_id, 'topic', study_exam_blueprint.topic_title, 'priority', study_exam_blueprint.priority_score, 'occurrence_percent', study_exam_blueprint.weighted_occurrence_percent, 'points_share_percent', study_exam_blueprint.weighted_points_share_percent, 'exam_ready_percent', study_exam_blueprint.exam_ready_percent, 'simulation_score_percent', study_exam_blueprint.certified_simulation_score_percent, 'unseen_in_past_exams', study_exam_blueprint.unseen_in_past_exams) ORDER BY study_exam_blueprint.priority_score DESC, study_exam_blueprint.topic_title) AS topic_priorities
           FROM study_exam_blueprint
          GROUP BY study_exam_blueprint.user_id, study_exam_blueprint.course_id
        ), base AS (
         SELECT s.user_id,
            s.course_id,
            s.semester_id,
            s.display_name,
            s.short_name,
            s.processed_exams,
            s.simulatable_exams,
            s.effective_exam_weight,
            s.exam_questions,
            s.verified_solution_coverage_percent,
            s.typical_duration_minutes,
            s.typical_total_points,
            s.blueprint_confidence,
            s.last_simulation_id,
            s.last_simulation_exam_id,
            s.last_simulation_at,
            s.last_score_percent,
            s.last_verified_score_percent,
            s.last_verified_coverage_percent,
            s.last_time_used_seconds,
            om.operating_mode,
            om.days_to_exam,
            om.recommended_mix,
            COALESCE(c.exam_duration_minutes::integer, round(s.typical_duration_minutes)::integer) AS strategy_duration_minutes,
            s.typical_total_points AS strategy_total_points,
            b_1.topic_priorities
           FROM study_exam_intelligence_summary s
             JOIN study_courses c ON c.user_id = s.user_id AND c.id = s.course_id
             LEFT JOIN study_course_operating_mode om ON om.user_id = s.user_id AND om.course_id = s.course_id
             LEFT JOIN btop b_1 ON b_1.user_id = s.user_id AND b_1.course_id = s.course_id
        )
 SELECT user_id,
    course_id,
    semester_id,
    display_name,
    short_name,
    processed_exams,
    simulatable_exams,
    effective_exam_weight,
    exam_questions,
    verified_solution_coverage_percent,
    typical_duration_minutes,
    typical_total_points,
    blueprint_confidence,
    last_simulation_id,
    last_simulation_exam_id,
    last_simulation_at,
    last_score_percent,
    last_verified_score_percent,
    last_verified_coverage_percent,
    last_time_used_seconds,
    operating_mode,
    days_to_exam,
    recommended_mix,
    strategy_duration_minutes,
    strategy_total_points,
    topic_priorities,
        CASE
            WHEN strategy_duration_minutes IS NULL THEN NULL::integer
            ELSE GREATEST(5, ceil(strategy_duration_minutes::numeric * 0.10)::integer)
        END AS final_check_minutes,
        CASE
            WHEN strategy_duration_minutes IS NULL THEN NULL::integer
            ELSE floor(strategy_duration_minutes::numeric * 0.75)::integer
        END AS first_pass_minutes,
        CASE
            WHEN strategy_duration_minutes IS NULL THEN NULL::integer
            ELSE GREATEST(1, strategy_duration_minutes - floor(strategy_duration_minutes::numeric * 0.75)::integer - GREATEST(5, ceil(strategy_duration_minutes::numeric * 0.10)::integer))
        END AS return_pass_minutes,
        CASE
            WHEN COALESCE(strategy_total_points, 0::double precision) > 0::double precision AND strategy_duration_minutes IS NOT NULL THEN round(((strategy_duration_minutes - GREATEST(5, ceil(strategy_duration_minutes::numeric * 0.10)::integer))::double precision / strategy_total_points)::numeric, 2)
            ELSE NULL::numeric
        END AS working_minutes_per_point,
        CASE
            WHEN processed_exams = 0 THEN 'process_past_exams'::text
            WHEN processed_exams < 2 THEN 'add_exam_evidence'::text
            WHEN COALESCE(operating_mode, 'semester'::text) = 'semester'::text THEN 'maintain_blueprint'::text
            WHEN last_simulation_id IS NULL THEN 'baseline_timed_paper'::text
            WHEN last_simulation_at < (now() - '10 days'::interval) THEN 'timed_paper'::text
            WHEN COALESCE(last_verified_coverage_percent, 0::numeric) < 60::numeric AND verified_solution_coverage_percent < 60::numeric THEN 'verify_solutions'::text
            WHEN COALESCE(last_verified_coverage_percent, 0::numeric) >= 60::numeric AND COALESCE(last_verified_score_percent, 0::numeric) < 65::numeric THEN 'repair_weaknesses'::text
            WHEN COALESCE(last_score_percent, 0::numeric) < 80::numeric THEN 'mixed_exam_practice'::text
            ELSE 'timed_paper'::text
        END AS next_action,
        CASE
            WHEN processed_exams = 0 THEN 'No past paper has been mapped yet; historical frequency cannot inform exam preparation.'::text
            WHEN processed_exams < 2 THEN 'One past paper is too weak a sample for reliable frequency claims; add another if available.'::text
            WHEN COALESCE(operating_mode, 'semester'::text) = 'semester'::text THEN 'Keep the blueprint current, but normal coursework and retention should still dominate.'::text
            WHEN last_simulation_id IS NULL THEN 'Run a closed-book baseline paper before optimizing strategy from assumptions.'::text
            WHEN last_simulation_at < (now() - '10 days'::interval) THEN 'The last full timed-paper evidence is stale for the current exam-preparation window.'::text
            WHEN COALESCE(last_verified_coverage_percent, 0::numeric) < 60::numeric AND verified_solution_coverage_percent < 60::numeric THEN 'Too little of the latest simulation can be graded against verified solutions; avoid treating the raw score as mastery evidence.'::text
            WHEN COALESCE(last_verified_coverage_percent, 0::numeric) >= 60::numeric AND COALESCE(last_verified_score_percent, 0::numeric) < 65::numeric THEN 'Verified timed performance is weak; repair the highest-priority blueprint gaps before another full paper.'::text
            WHEN COALESCE(last_score_percent, 0::numeric) < 80::numeric THEN 'Performance is viable but not yet strong; combine targeted exam problems with weakness repair.'::text
            ELSE 'Performance is strong enough that repeated timed papers and execution refinement are now the highest-value work.'::text
        END AS next_action_reason
   FROM base b;
revoke all on public.study_exam_strategy from anon;
grant select on public.study_exam_strategy to authenticated;
