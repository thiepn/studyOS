create or replace view public.study_skill_retention_diagnostics
with (security_invoker=true)
as
with source_week as (
  select rs.user_id,rs.skill_id,min(tw.week_no)::int as first_week_no
  from public.study_resource_skills rs
  join public.study_resources r on r.user_id=rs.user_id and r.id=rs.resource_id and r.active
  left join public.study_teaching_weeks tw on tw.user_id=r.user_id and tw.id=r.teaching_week_id
  group by rs.user_id,rs.skill_id
),
attempt_stats as (
  select a.user_id,a.skill_id,
         count(*) filter(where a.completed_at>=now()-interval '28 days')::int as attempts_28d,
         count(*) filter(where a.completed_at>=now()-interval '28 days' and a.result='correct' and a.independence='independent')::int as independent_correct_28d,
         count(*) filter(where a.completed_at>=now()-interval '28 days' and a.result='incorrect')::int as incorrect_28d,
         max(a.completed_at) filter(where a.result='incorrect') as last_incorrect_at
  from public.study_attempts a group by a.user_id,a.skill_id
),
base as (
  select s.user_id,s.course_id,c.semester_id,s.id as skill_id,s.stable_key,s.title as skill_title,
         s.skill_kind,s.required_dimensions,s.exam_importance,s.prerequisite_importance,sw.first_week_no,
         coalesce(rv.mastery_state,'new'::public.study_mastery_state) as mastery_state,
         coalesce(rv.total_attempts,0) as total_attempts,coalesce(rv.independent_successes,0) as independent_successes,
         coalesce(rv.delayed_successes,0) as delayed_successes,coalesce(rv.lapse_count,0) as lapse_count,
         coalesce(rv.consecutive_failures,0) as consecutive_failures,coalesce(rv.stability_days,0) as stability_days,
         rv.last_attempt_at,rv.last_independent_success_at,rv.relearning_until,rv.next_review_at,rv.due_reason,
         coalesce(public.study_required_evidence_floor(
           s.required_dimensions,coalesce(rv.recall_evidence,0),coalesce(rv.recognition_evidence,0),
           coalesce(rv.execution_evidence,0),coalesce(rv.transfer_evidence,0),coalesce(rv.exam_evidence,0)
         ),0) as evidence_floor,
         coalesce(ast.attempts_28d,0) as attempts_28d,coalesce(ast.independent_correct_28d,0) as independent_correct_28d,
         coalesce(ast.incorrect_28d,0) as incorrect_28d,ast.last_incorrect_at,
         coalesce(rv.recall_evidence,0) as recall_evidence,
         coalesce(rv.recognition_evidence,0) as recognition_evidence,
         coalesce(rv.execution_evidence,0) as execution_evidence,
         coalesce(rv.transfer_evidence,0) as transfer_evidence,
         coalesce(rv.exam_evidence,0) as exam_evidence
  from public.study_skills s
  join public.study_courses c on c.user_id=s.user_id and c.id=s.course_id and c.active
  left join public.study_review_state rv on rv.user_id=s.user_id and rv.skill_id=s.id
  left join source_week sw on sw.user_id=s.user_id and sw.skill_id=s.id
  left join attempt_stats ast on ast.user_id=s.user_id and ast.skill_id=s.id
  where s.active
)
select
  b.user_id,b.course_id,b.semester_id,b.skill_id,b.stable_key,b.skill_title,b.skill_kind,b.required_dimensions,
  b.exam_importance,b.prerequisite_importance,b.first_week_no,b.mastery_state,b.total_attempts,b.independent_successes,
  b.delayed_successes,b.lapse_count,b.consecutive_failures,b.stability_days,b.last_attempt_at,b.last_independent_success_at,
  b.relearning_until,b.next_review_at,b.due_reason,b.evidence_floor,b.attempts_28d,b.independent_correct_28d,b.incorrect_28d,b.last_incorrect_at,
  case when b.last_attempt_at is null then null else round((extract(epoch from (now()-b.last_attempt_at))/86400.0)::numeric,1) end as days_since_last_attempt,
  case when b.next_review_at is null then 0::numeric else round(greatest(0,extract(epoch from (now()-b.next_review_at))/86400.0)::numeric,1) end as overdue_days,
  (b.relearning_until is not null and b.relearning_until>=now()) as relearning,
  (b.independent_successes>=2 and b.last_incorrect_at>=now()-interval '28 days') as recent_lapse,
  case when b.total_attempts=0 then 'untested'
       when b.relearning_until is not null and b.relearning_until>=now() then 'relearning'
       when b.independent_successes>=2 and b.last_incorrect_at>=now()-interval '28 days' then 'lapsed'
       when b.next_review_at<=now()-interval '7 days' then 'overdue'
       when b.next_review_at<=now() then 'due' else 'maintained' end as retention_state,
  case when b.total_attempts=0 then 0::numeric else
    round(least(100,(1-b.evidence_floor)*35
      + least(30,greatest(0,extract(epoch from (now()-coalesce(b.next_review_at,now())))/86400.0)*3)
      + least(20,b.lapse_count*4)
      + case when b.relearning_until is not null and b.relearning_until>=now() then 15 else 0 end
    )::numeric,1) end as retention_pressure,
  b.recall_evidence,b.recognition_evidence,b.execution_evidence,b.transfer_evidence,b.exam_evidence
from base b;

revoke all on public.study_skill_retention_diagnostics from anon;
grant select on public.study_skill_retention_diagnostics to authenticated;
