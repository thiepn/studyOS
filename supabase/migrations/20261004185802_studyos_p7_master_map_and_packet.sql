create or replace function study_internal.candidate_has_anchor(p_source jsonb)
returns boolean
language sql
immutable
set search_path=''
as $$
  select
    p_source is not null
    and jsonb_typeof(p_source)='object'
    and (
      nullif(btrim(p_source->>'section_label'),'') is not null
      or (p_source->>'page_start') ~ '^[0-9]+$'
      or (p_source->>'page_end') ~ '^[0-9]+$'
    );
$$;

revoke all on function study_internal.candidate_has_anchor(jsonb)
from public,anon,authenticated;

create or replace view public.study_course_master_map
with (security_invoker=true)
as
with skill_state as (
  select
    s.user_id,
    s.course_id,
    s.id as skill_id,
    s.stable_key as skill_key,
    s.title as skill_title,
    s.skill_kind,
    s.required_dimensions,
    s.exam_importance,
    s.prerequisite_importance,
    coalesce(rv.mastery_state,'new'::public.study_mastery_state) as mastery_state,
    rv.next_review_at,
    rv.recall_evidence,
    rv.recognition_evidence,
    rv.execution_evidence,
    rv.transfer_evidence,
    rv.exam_evidence,
    count(distinct e.id) filter(where e.resolved_at is null)::int as unresolved_errors
  from public.study_skills s
  left join public.study_review_state rv
    on rv.user_id=s.user_id and rv.skill_id=s.id
  left join public.study_errors e
    on e.user_id=s.user_id and e.skill_id=s.id
  where s.active
  group by
    s.user_id,s.course_id,s.id,s.stable_key,s.title,s.skill_kind,
    s.required_dimensions,s.exam_importance,s.prerequisite_importance,
    rv.mastery_state,rv.next_review_at,rv.recall_evidence,rv.recognition_evidence,
    rv.execution_evidence,rv.transfer_evidence,rv.exam_evidence
),
topic_sources as (
  select
    ts.user_id,
    ts.topic_id,
    count(distinct r.id)::int as source_resource_count,
    min(tw.week_no) as first_source_week,
    max(tw.week_no) as latest_source_week,
    array_remove(array_agg(distinct r.title),null) as source_titles
  from public.study_topic_skills ts
  join public.study_resource_skills rs
    on rs.user_id=ts.user_id and rs.skill_id=ts.skill_id
  join public.study_resources r
    on r.user_id=rs.user_id and r.id=rs.resource_id and r.active
  left join public.study_teaching_weeks tw
    on tw.user_id=r.user_id and tw.id=r.teaching_week_id
  group by ts.user_id,ts.topic_id
),
topic_stats as (
  select
    ts.user_id,
    t.course_id,
    t.id as topic_id,
    t.stable_key as topic_key,
    t.title as topic_title,
    t.description as topic_description,
    t.first_week_no,
    count(distinct ss.skill_id)::int as skill_count,
    count(distinct ss.skill_id) filter(where ss.mastery_state='new')::int as new_skills,
    count(distinct ss.skill_id) filter(where ss.mastery_state='learning')::int as learning_skills,
    count(distinct ss.skill_id) filter(where ss.mastery_state='fragile')::int as fragile_skills,
    count(distinct ss.skill_id) filter(where ss.mastery_state='stable')::int as stable_skills,
    count(distinct ss.skill_id) filter(where ss.mastery_state='exam_ready')::int as exam_ready_skills,
    coalesce(sum(ss.unresolved_errors),0)::int as unresolved_errors,
    round(
      100.0 * count(distinct ss.skill_id) filter(where ss.mastery_state in ('stable','exam_ready'))
      / nullif(count(distinct ss.skill_id),0),
      1
    ) as durable_percent,
    jsonb_agg(
      distinct jsonb_build_object(
        'id',ss.skill_id,
        'stable_key',ss.skill_key,
        'title',ss.skill_title,
        'kind',ss.skill_kind,
        'required_dimensions',ss.required_dimensions,
        'mastery_state',ss.mastery_state,
        'next_review_at',ss.next_review_at,
        'evidence',jsonb_build_object(
          'recall',coalesce(ss.recall_evidence,0),
          'recognition',coalesce(ss.recognition_evidence,0),
          'execution',coalesce(ss.execution_evidence,0),
          'transfer',coalesce(ss.transfer_evidence,0),
          'exam',coalesce(ss.exam_evidence,0)
        ),
        'exam_importance',ss.exam_importance,
        'prerequisite_importance',ss.prerequisite_importance,
        'unresolved_errors',ss.unresolved_errors
      )
    ) filter(where ss.skill_id is not null) as skills
  from public.study_topics t
  join public.study_topic_skills ts
    on ts.user_id=t.user_id and ts.topic_id=t.id
  join skill_state ss
    on ss.user_id=ts.user_id and ss.skill_id=ts.skill_id
  where t.active
  group by ts.user_id,t.course_id,t.id,t.stable_key,t.title,t.description,t.first_week_no
)
select
  s.user_id,
  s.course_id,
  c.semester_id,
  s.topic_id,
  s.topic_key,
  s.topic_title,
  s.topic_description,
  coalesce(s.first_week_no,src.first_source_week) as first_week_no,
  src.latest_source_week,
  s.skill_count,
  s.new_skills,
  s.learning_skills,
  s.fragile_skills,
  s.stable_skills,
  s.exam_ready_skills,
  s.unresolved_errors,
  coalesce(s.durable_percent,0) as durable_percent,
  coalesce(src.source_resource_count,0) as source_resource_count,
  coalesce(src.source_titles,'{}'::text[]) as source_titles,
  coalesce(s.skills,'[]'::jsonb) as skills
from topic_stats s
join public.study_courses c
  on c.user_id=s.user_id and c.id=s.course_id
left join topic_sources src
  on src.user_id=s.user_id and src.topic_id=s.topic_id;

revoke all on public.study_course_master_map from anon;
grant select on public.study_course_master_map to authenticated;

create or replace function public.study_get_processing_packet(p_run_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_user uuid := (select auth.uid());
  v_run public.study_ingestion_runs%rowtype;
  v_resource public.study_resources%rowtype;
  v_course public.study_courses%rowtype;
  v_week_no smallint;
  v_existing jsonb;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then
    raise exception 'permanent account required';
  end if;

  select * into v_run
  from public.study_ingestion_runs
  where id=p_run_id and user_id=v_user;
  if not found then raise exception 'ingestion run not found'; end if;
  if v_run.status not in ('queued','candidate') then
    raise exception 'ingestion run is not processable';
  end if;

  select * into v_resource
  from public.study_resources
  where id=v_run.resource_id and user_id=v_user;

  select * into v_course
  from public.study_courses
  where id=v_run.course_id and user_id=v_user;

  select week_no into v_week_no
  from public.study_teaching_weeks
  where id=v_resource.teaching_week_id and user_id=v_user;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'stable_key',t.stable_key,
      'title',t.title,
      'description',t.description,
      'first_week_no',t.first_week_no,
      'skills',coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'stable_key',s.stable_key,
            'title',s.title,
            'kind',s.skill_kind,
            'required_dimensions',s.required_dimensions,
            'exam_importance',s.exam_importance,
            'prerequisite_importance',s.prerequisite_importance
          )
          order by s.title
        )
        from public.study_topic_skills ts
        join public.study_skills s
          on s.user_id=ts.user_id and s.id=ts.skill_id and s.active
        where ts.user_id=t.user_id and ts.topic_id=t.id
      ),'[]'::jsonb)
    )
    order by coalesce(t.first_week_no,999),t.title
  ),'[]'::jsonb)
  into v_existing
  from public.study_topics t
  where t.user_id=v_user and t.course_id=v_course.id and t.active;

  return jsonb_build_object(
    'schema_version','studyos-processing-v1',
    'ingestion_run_id',v_run.id,
    'course',jsonb_build_object(
      'id',v_course.id,
      'stable_key',v_course.stable_key,
      'display_name',v_course.display_name,
      'short_name',v_course.short_name,
      'course_kind',v_course.course_kind,
      'exam_format',v_course.exam_format
    ),
    'resource',jsonb_build_object(
      'id',v_resource.id,
      'title',v_resource.title,
      'resource_type',v_resource.resource_type,
      'source_authority',v_resource.source_authority,
      'week_no',v_week_no,
      'drive_url',v_resource.drive_url,
      'mime_type',v_resource.mime_type,
      'original_filename',v_resource.original_filename
    ),
    'existing_course_map',v_existing
  );
end;
$$;

revoke all on function public.study_get_processing_packet(uuid) from public,anon;
grant execute on function public.study_get_processing_packet(uuid) to authenticated;
