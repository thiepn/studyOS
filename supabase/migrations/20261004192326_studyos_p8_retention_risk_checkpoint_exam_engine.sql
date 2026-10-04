alter table public.study_course_workflow_settings
  add column if not exists transition_lead_days smallint not null default 35,
  add column if not exists exam_mode_lead_days smallint not null default 21,
  add column if not exists checkpoint_budget_minutes smallint not null default 60;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='study_course_workflow_settings_exam_leads_check') then
    alter table public.study_course_workflow_settings
      add constraint study_course_workflow_settings_exam_leads_check
      check (exam_mode_lead_days between 7 and 42 and transition_lead_days between 14 and 70 and exam_mode_lead_days < transition_lead_days);
  end if;
  if not exists (select 1 from pg_constraint where conname='study_course_workflow_settings_checkpoint_budget_check') then
    alter table public.study_course_workflow_settings
      add constraint study_course_workflow_settings_checkpoint_budget_check
      check (checkpoint_budget_minutes between 30 and 90);
  end if;
end $$;

create or replace view public.study_course_configuration
with (security_invoker=true)
as
select c.user_id,c.id as course_id,c.semester_id,c.stable_key,c.display_name,c.short_name,c.course_kind,
       c.professor,c.credits,c.exam_at,c.exam_duration_minutes,c.exam_format,c.sort_order,c.active,c.drive_folder_url,
       w.expected_lectures_per_week,w.expects_exercise,w.expects_solution,
       w.lecture_retrieval_target_hours,w.solution_reconcile_target_hours,w.checkpoint_weight,
       w.transition_lead_days,w.exam_mode_lead_days,w.checkpoint_budget_minutes
from public.study_courses c
left join public.study_course_workflow_settings w on w.user_id=c.user_id and w.course_id=c.id;

revoke all on public.study_course_configuration from anon;
grant select on public.study_course_configuration to authenticated;

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
  from public.study_attempts a
  group by a.user_id,a.skill_id
),
base as (
  select s.user_id,s.course_id,c.semester_id,s.id as skill_id,s.stable_key,s.title as skill_title,
         s.skill_kind,s.required_dimensions,s.exam_importance,s.prerequisite_importance,
         sw.first_week_no,
         coalesce(rv.mastery_state,'new'::public.study_mastery_state) as mastery_state,
         coalesce(rv.total_attempts,0) as total_attempts,
         coalesce(rv.independent_successes,0) as independent_successes,
         coalesce(rv.delayed_successes,0) as delayed_successes,
         coalesce(rv.lapse_count,0) as lapse_count,
         coalesce(rv.consecutive_failures,0) as consecutive_failures,
         coalesce(rv.stability_days,0) as stability_days,
         rv.last_attempt_at,rv.last_independent_success_at,rv.relearning_until,rv.next_review_at,rv.due_reason,
         coalesce(public.study_required_evidence_floor(
           s.required_dimensions,
           coalesce(rv.recall_evidence,0),coalesce(rv.recognition_evidence,0),coalesce(rv.execution_evidence,0),
           coalesce(rv.transfer_evidence,0),coalesce(rv.exam_evidence,0)
         ),0) as evidence_floor,
         coalesce(ast.attempts_28d,0) as attempts_28d,
         coalesce(ast.independent_correct_28d,0) as independent_correct_28d,
         coalesce(ast.incorrect_28d,0) as incorrect_28d,
         ast.last_incorrect_at
  from public.study_skills s
  join public.study_courses c on c.user_id=s.user_id and c.id=s.course_id and c.active
  left join public.study_review_state rv on rv.user_id=s.user_id and rv.skill_id=s.id
  left join source_week sw on sw.user_id=s.user_id and sw.skill_id=s.id
  left join attempt_stats ast on ast.user_id=s.user_id and ast.skill_id=s.id
  where s.active
)
select b.*,
       case when b.last_attempt_at is null then null
            else round((extract(epoch from (now()-b.last_attempt_at))/86400.0)::numeric,1) end as days_since_last_attempt,
       case when b.next_review_at is null then 0::numeric
            else round(greatest(0,extract(epoch from (now()-b.next_review_at))/86400.0)::numeric,1) end as overdue_days,
       (b.relearning_until is not null and b.relearning_until>=now()) as relearning,
       (b.independent_successes>=2 and b.last_incorrect_at>=now()-interval '28 days') as recent_lapse,
       case
         when b.total_attempts=0 then 'untested'
         when b.relearning_until is not null and b.relearning_until>=now() then 'relearning'
         when b.independent_successes>=2 and b.last_incorrect_at>=now()-interval '28 days' then 'lapsed'
         when b.next_review_at<=now()-interval '7 days' then 'overdue'
         when b.next_review_at<=now() then 'due'
         else 'maintained'
       end as retention_state,
       case when b.total_attempts=0 then 0::numeric else
         round(least(100,
           (1-b.evidence_floor)*35
           + least(30,greatest(0,extract(epoch from (now()-coalesce(b.next_review_at,now())))/86400.0)*3)
           + least(20,b.lapse_count*4)
           + case when b.relearning_until is not null and b.relearning_until>=now() then 15 else 0 end
         )::numeric,1)
       end as retention_pressure
from base b;

revoke all on public.study_skill_retention_diagnostics from anon;
grant select on public.study_skill_retention_diagnostics to authenticated;

create or replace view public.study_course_retention_diagnostics
with (security_invoker=true)
as
select d.user_id,d.course_id,d.semester_id,
       count(*)::int as total_skills,
       count(*) filter(where d.total_attempts>0)::int as tested_skills,
       count(*) filter(where d.retention_state='untested')::int as untested_skills,
       count(*) filter(where d.retention_state in ('due','overdue','relearning','lapsed'))::int as due_or_at_risk_skills,
       count(*) filter(where d.overdue_days>=7)::int as overdue_7d_skills,
       count(*) filter(where d.relearning)::int as relearning_skills,
       count(*) filter(where d.recent_lapse)::int as recent_lapse_skills,
       round(coalesce(avg(d.retention_pressure) filter(where d.total_attempts>0),0),1) as avg_retention_pressure,
       sum(d.attempts_28d)::int as attempts_28d,
       sum(d.independent_correct_28d)::int as independent_correct_28d,
       sum(d.incorrect_28d)::int as incorrect_28d,
       case when sum(d.attempts_28d)>0
            then round(100.0*sum(d.independent_correct_28d)/sum(d.attempts_28d),1)
            else null end as independent_success_percent_28d
from public.study_skill_retention_diagnostics d
group by d.user_id,d.course_id,d.semester_id;

revoke all on public.study_course_retention_diagnostics from anon;
grant select on public.study_course_retention_diagnostics to authenticated;

create or replace view public.study_course_operating_mode
with (security_invoker=true)
as
select cfg.user_id,cfg.course_id,cfg.semester_id,cfg.stable_key,cfg.display_name,cfg.short_name,cfg.course_kind,cfg.exam_at,
       cfg.transition_lead_days,cfg.exam_mode_lead_days,cfg.checkpoint_budget_minutes,
       case when cfg.exam_at is null then null
            else floor(extract(epoch from (cfg.exam_at-now()))/86400.0)::int end as days_to_exam,
       case
         when cfg.exam_at is not null and cfg.exam_at<now() then 'post_exam'
         when cfg.exam_at is not null and cfg.exam_at<=now()+make_interval(days=>coalesce(cfg.exam_mode_lead_days,21)) then 'exam'
         when cfg.exam_at is not null and cfg.exam_at<=now()+make_interval(days=>coalesce(cfg.transition_lead_days,35)) then 'transition'
         else 'semester'
       end as operating_mode,
       case
         when cfg.exam_at is not null and cfg.exam_at<now() then jsonb_build_object('exam_practice',0,'weakness_repair',0,'pure_recall',0)
         when cfg.exam_at is not null and cfg.exam_at<=now()+make_interval(days=>coalesce(cfg.exam_mode_lead_days,21))
           then jsonb_build_object('exam_practice',65,'weakness_repair',25,'pure_recall',10)
         when cfg.exam_at is not null and cfg.exam_at<=now()+make_interval(days=>coalesce(cfg.transition_lead_days,35))
           then jsonb_build_object('current_coursework',35,'retention_repair',30,'exam_practice',35)
         else jsonb_build_object('current_coursework',60,'retention',35,'exam_practice',5)
       end as recommended_mix
from public.study_course_configuration cfg
where cfg.active;

revoke all on public.study_course_operating_mode from anon;
grant select on public.study_course_operating_mode to authenticated;

create or replace view public.study_semester_checkpoint_rotation
with (security_invoker=true)
as
with clocks as (
  select s.user_id,s.id as semester_id,s.starts_on,
         case when current_date<s.starts_on then 0
              else ((current_date-s.starts_on)/7)+1 end::int as current_week_no
  from public.study_semesters s
  where s.active
),
majors as (
  select c.user_id,c.semester_id,c.id as course_id,c.display_name,c.short_name,c.sort_order,
         row_number() over(partition by c.user_id,c.semester_id order by c.sort_order,c.id)::int as rotation_rank,
         count(*) over(partition by c.user_id,c.semester_id)::int as major_count
  from public.study_courses c
  where c.active and c.course_kind='major'
),
target as (
  select cl.user_id,cl.semester_id,cl.starts_on,cl.current_week_no,
         greatest(1,cl.current_week_no) as target_week_no,
         m.course_id,m.display_name,m.short_name,m.major_count
  from clocks cl
  join majors m on m.user_id=cl.user_id and m.semester_id=cl.semester_id
   and m.rotation_rank=(((greatest(1,cl.current_week_no)-1)%m.major_count)+1)
)
select t.user_id,t.semester_id,t.current_week_no,t.target_week_no,t.course_id,t.display_name,t.short_name,
       coalesce(w.checkpoint_budget_minutes,60) as budget_minutes,
       (t.starts_on+((t.target_week_no-1)*7))::date as week_starts_on,
       (t.starts_on+((t.target_week_no-1)*7)+6)::date as week_ends_on,
       coalesce(sk.eligible_skills,0) as eligible_skills,
       exists(
         select 1 from public.study_sessions ss
         where ss.user_id=t.user_id and ss.course_id=t.course_id and ss.session_type='checkpoint'
           and ss.ended_at is not null
           and ss.started_at::date between (t.starts_on+((t.target_week_no-1)*7))::date and (t.starts_on+((t.target_week_no-1)*7)+6)::date
       ) as completed,
       (t.current_week_no>=1 and coalesce(sk.eligible_skills,0)>0 and not exists(
         select 1 from public.study_sessions ss
         where ss.user_id=t.user_id and ss.course_id=t.course_id and ss.session_type='checkpoint'
           and ss.ended_at is not null
           and ss.started_at::date between (t.starts_on+((t.target_week_no-1)*7))::date and (t.starts_on+((t.target_week_no-1)*7)+6)::date
       )) as due
from target t
left join public.study_course_workflow_settings w on w.user_id=t.user_id and w.course_id=t.course_id
left join lateral (
  select count(*)::int as eligible_skills
  from public.study_skill_retention_diagnostics d
  where d.user_id=t.user_id and d.course_id=t.course_id
    and (d.first_week_no is null or d.first_week_no<=t.target_week_no)
    and exists(select 1 from public.study_questions q where q.user_id=d.user_id and q.primary_skill_id=d.skill_id and q.active)
) sk on true;

revoke all on public.study_semester_checkpoint_rotation from anon;
grant select on public.study_semester_checkpoint_rotation to authenticated;

create or replace view public.study_course_risk
with (security_invoker=true)
as
with workflow as (
  select w.user_id,w.course_id,
         count(*) filter(where w.next_action in ('process_material','retrieve_lecture','attempt_exercise','reconcile_solution','repair_findings'))::int as actionable_backlog
  from public.study_week_actions w
  group by w.user_id,w.course_id
),
base as (
  select cp.user_id,cp.course_id,cp.semester_id,cp.stable_key,cp.display_name,cp.short_name,cp.course_kind,
         cp.total_skills,cp.coverage_percent,cp.durable_mastery_percent,cp.exam_ready_skills,cp.unverified_resources,cp.unresolved_errors,
         coalesce(rd.tested_skills,0) as tested_skills,coalesce(rd.due_or_at_risk_skills,0) as due_or_at_risk_skills,
         coalesce(rd.overdue_7d_skills,0) as overdue_7d_skills,coalesce(rd.relearning_skills,0) as relearning_skills,
         coalesce(rd.recent_lapse_skills,0) as recent_lapse_skills,coalesce(rd.avg_retention_pressure,0) as avg_retention_pressure,
         rd.independent_success_percent_28d,
         om.operating_mode,om.days_to_exam,om.recommended_mix,
         coalesce(w.actionable_backlog,0) as actionable_backlog,
         case when cp.total_skills>0 then round(100.0*cp.exam_ready_skills/cp.total_skills,1) else 0 end as exam_ready_percent
  from public.study_course_progress cp
  left join public.study_course_retention_diagnostics rd on rd.user_id=cp.user_id and rd.course_id=cp.course_id
  left join public.study_course_operating_mode om on om.user_id=cp.user_id and om.course_id=cp.course_id
  left join workflow w on w.user_id=cp.user_id and w.course_id=cp.course_id
),
scored as (
  select b.*,
    round(least(25,b.avg_retention_pressure*0.25),1) as retention_component,
    round(case when b.tested_skills>0 then least(20,20.0*b.overdue_7d_skills/b.tested_skills) else 0 end,1) as overdue_component,
    round(case when b.tested_skills>0 then least(15,15.0*b.recent_lapse_skills/b.tested_skills) else 0 end,1) as lapse_component,
    round(least(20,b.actionable_backlog*5+b.unverified_resources*2),1) as workflow_component,
    round(least(10,b.unresolved_errors*1.5),1) as error_component,
    round(case
      when b.operating_mode='exam' then (100-b.exam_ready_percent)*0.25
      when b.operating_mode='transition' then (100-b.exam_ready_percent)*0.10
      else 0 end,1) as exam_component
  from base b
)
select s.*,
       round(least(100,s.retention_component+s.overdue_component+s.lapse_component+s.workflow_component+s.error_component+s.exam_component),1) as risk_score,
       case
         when least(100,s.retention_component+s.overdue_component+s.lapse_component+s.workflow_component+s.error_component+s.exam_component)>=60 then 'critical'
         when least(100,s.retention_component+s.overdue_component+s.lapse_component+s.workflow_component+s.error_component+s.exam_component)>=40 then 'at_risk'
         when least(100,s.retention_component+s.overdue_component+s.lapse_component+s.workflow_component+s.error_component+s.exam_component)>=20 then 'watch'
         else 'healthy'
       end as risk_band,
       jsonb_build_object(
         'retention',s.retention_component,'overdue',s.overdue_component,'recent_lapses',s.lapse_component,
         'workflow',s.workflow_component,'errors',s.error_component,'exam_readiness',s.exam_component
       ) as risk_components
from scored s;

revoke all on public.study_course_risk from anon;
grant select on public.study_course_risk to authenticated;

create or replace function public.study_start_study_session(
  p_session_id uuid,
  p_session_type public.study_session_type,
  p_course_id uuid default null,
  p_planned_minutes smallint default null,
  p_started_at timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_user uuid := (select auth.uid());
  v_session public.study_sessions%rowtype;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if p_planned_minutes is not null and (p_planned_minutes<1 or p_planned_minutes>600) then raise exception 'planned_minutes out of range'; end if;
  if p_started_at>now()+interval '5 minutes' then raise exception 'started_at is in the future'; end if;
  if p_course_id is not null and not exists(
    select 1 from public.study_courses where id=p_course_id and user_id=v_user and active
  ) then raise exception 'course not found'; end if;
  insert into public.study_sessions(id,user_id,course_id,session_type,planned_minutes,started_at)
  values(p_session_id,v_user,p_course_id,p_session_type,p_planned_minutes,p_started_at)
  on conflict(id) do nothing;
  select * into v_session from public.study_sessions where id=p_session_id and user_id=v_user;
  if not found then raise exception 'session id unavailable'; end if;
  return jsonb_build_object(
    'session_id',v_session.id,'session_type',v_session.session_type,'course_id',v_session.course_id,
    'started_at',v_session.started_at,'planned_minutes',v_session.planned_minutes,'ended_at',v_session.ended_at
  );
end;
$$;
revoke all on function public.study_start_study_session(uuid,public.study_session_type,uuid,smallint,timestamptz) from public,anon;
grant execute on function public.study_start_study_session(uuid,public.study_session_type,uuid,smallint,timestamptz) to authenticated;

create or replace view public.study_week_actions
with (security_invoker=true)
as
with finding_counts as (
  select user_id,teaching_week_id,
         count(*) filter(where status in ('open','repair_scheduled'))::int as open_findings,
         count(*) filter(where status='repair_scheduled')::int as scheduled_repairs
  from public.study_reconciliation_findings
  group by user_id,teaching_week_id
)
select h.user_id,h.course_id,h.semester_id,h.teaching_week_id,h.week_no,h.course_stable_key,h.course_display_name,
       h.resource_count,h.lecture_count,h.exercise_count,h.solution_count,h.verified_resources,h.pending_resources,h.candidate_runs,
       h.skill_count,h.new_skills,h.learning_skills,h.fragile_skills,h.stable_skills,h.exam_ready_skills,h.due_skills,h.due_minutes,
       h.unresolved_errors,h.expected_lectures_per_week,h.expects_exercise,h.expects_solution,h.health_status,
       h.lecture_expectation_met,h.exercise_expectation_met,h.solution_expectation_met,
       wf.lecture_retrieval_completed_at,wf.lecture_resource_count_at_retrieval,
       wf.exercise_attempt_completed_at,wf.exercise_resource_count_at_attempt,
       wf.solution_reconciled_at,wf.solution_resource_count_at_reconcile,
       wf.checkpoint_completed_at,wf.checkpoint_skill_count_at_completion,
       coalesce(fc.open_findings,0) as open_findings,coalesce(fc.scheduled_repairs,0) as scheduled_repairs,
       h.lecture_count>0 and (wf.lecture_retrieval_completed_at is null or wf.lecture_resource_count_at_retrieval<h.lecture_count) as lecture_retrieval_due,
       h.exercise_count>0 and (wf.exercise_attempt_completed_at is null or wf.exercise_resource_count_at_attempt<h.exercise_count) as exercise_attempt_due,
       h.solution_count>0 and (wf.solution_reconciled_at is null or wf.solution_resource_count_at_reconcile<h.solution_count) as solution_reconcile_due,
       false as checkpoint_due,
       case
         when h.resource_count=0 then 'await_material'
         when h.pending_resources>0 or h.candidate_runs>0 then 'process_material'
         when h.lecture_count>0 and (wf.lecture_retrieval_completed_at is null or wf.lecture_resource_count_at_retrieval<h.lecture_count) then 'retrieve_lecture'
         when h.exercise_count>0 and (wf.exercise_attempt_completed_at is null or wf.exercise_resource_count_at_attempt<h.exercise_count) then 'attempt_exercise'
         when h.expects_exercise and h.exercise_count=0 then 'await_exercise'
         when h.solution_count>0 and (wf.solution_reconciled_at is null or wf.solution_resource_count_at_reconcile<h.solution_count) then 'reconcile_solution'
         when h.expects_solution and h.solution_count=0 and (not h.expects_exercise or (h.exercise_count>0 and wf.exercise_attempt_completed_at is not null and wf.exercise_resource_count_at_attempt>=h.exercise_count)) then 'await_solution'
         when coalesce(fc.open_findings,0)>0 then 'repair_findings'
         else 'maintain'
       end as next_action
from public.study_weekly_health h
left join public.study_week_workflow wf on wf.user_id=h.user_id and wf.teaching_week_id=h.teaching_week_id
left join finding_counts fc on fc.user_id=h.user_id and fc.teaching_week_id=h.teaching_week_id;

revoke all on public.study_week_actions from anon;
grant select on public.study_week_actions to authenticated;
