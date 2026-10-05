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
  v_exams jsonb;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  select * into v_run from public.study_ingestion_runs where id=p_run_id and user_id=v_user;
  if not found then raise exception 'ingestion run not found'; end if;
  if v_run.status not in ('queued','candidate') then raise exception 'ingestion run is not processable'; end if;

  select * into v_resource from public.study_resources where id=v_run.resource_id and user_id=v_user;
  select * into v_course from public.study_courses where id=v_run.course_id and user_id=v_user;
  select week_no into v_week_no from public.study_teaching_weeks where id=v_resource.teaching_week_id and user_id=v_user;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'stable_key',t.stable_key,'title',t.title,'description',t.description,'first_week_no',t.first_week_no,
      'skills',coalesce((
        select jsonb_agg(jsonb_build_object(
          'stable_key',s.stable_key,'title',s.title,'kind',s.skill_kind,
          'required_dimensions',s.required_dimensions,'exam_importance',s.exam_importance,
          'prerequisite_importance',s.prerequisite_importance
        ) order by s.title)
        from public.study_topic_skills ts
        join public.study_skills s on s.user_id=ts.user_id and s.id=ts.skill_id and s.active
        where ts.user_id=t.user_id and ts.topic_id=t.id
      ),'[]'::jsonb)
    ) order by coalesce(t.first_week_no,999),t.title
  ),'[]'::jsonb)
  into v_existing
  from public.study_topics t
  where t.user_id=v_user and t.course_id=v_course.id and t.active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'stable_key',e.stable_key,'title',e.title,'year_label',e.year_label,
    'duration_minutes',e.duration_minutes,'total_points',e.total_points,
    'syllabus_relevance',e.syllabus_relevance,'official',e.official,'active',e.active,
    'has_solution',e.solution_resource_id is not null
  ) order by e.exam_at desc nulls last,e.year_label desc nulls last,e.title),'[]'::jsonb)
  into v_exams
  from public.study_exams e
  where e.user_id=v_user and e.course_id=v_course.id;

  return jsonb_build_object(
    'schema_version','studyos-processing-v1',
    'ingestion_run_id',v_run.id,
    'course',jsonb_build_object(
      'id',v_course.id,'stable_key',v_course.stable_key,'display_name',v_course.display_name,
      'short_name',v_course.short_name,'course_kind',v_course.course_kind,'exam_format',v_course.exam_format
    ),
    'resource',jsonb_build_object(
      'id',v_resource.id,'title',v_resource.title,'resource_type',v_resource.resource_type,
      'source_authority',v_resource.source_authority,'week_no',v_week_no,'drive_url',v_resource.drive_url,
      'mime_type',v_resource.mime_type,'original_filename',v_resource.original_filename
    ),
    'existing_course_map',v_existing,
    'existing_exams',v_exams
  );
end;
$$;

revoke all on function public.study_get_processing_packet(uuid) from public,anon;
grant execute on function public.study_get_processing_packet(uuid) to authenticated;
