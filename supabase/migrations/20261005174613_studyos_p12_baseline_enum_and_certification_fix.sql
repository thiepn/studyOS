create or replace function public.study_start_baseline(p_course_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_user uuid := (select auth.uid());
  v_semester uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce(((select auth.jwt())->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  select semester_id into v_semester
  from public.study_courses
  where id=p_course_id and user_id=v_user and active and course_kind='retake';
  if v_semester is null then raise exception 'retake course not found'; end if;

  insert into public.study_baseline_diagnostics(user_id,semester_id,course_id,status,started_at)
  values(v_user,v_semester,p_course_id,'in_progress'::public.study_baseline_status,now())
  on conflict(user_id,course_id) do update
    set status=case
      when public.study_baseline_diagnostics.status='completed'::public.study_baseline_status
        then 'completed'::public.study_baseline_status
      else 'in_progress'::public.study_baseline_status
    end,
    started_at=coalesce(public.study_baseline_diagnostics.started_at,now()),
    updated_at=now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.study_start_baseline(uuid) from public,anon;
grant execute on function public.study_start_baseline(uuid) to authenticated;

create or replace view public.study_activation_snapshot
with (security_invoker=true)
as
select
  s.user_id,
  s.id as semester_id,
  s.stable_key,
  s.starts_on,
  s.ends_on,
  s.timezone,
  (select count(*)::integer from public.study_courses c where c.user_id=s.user_id and c.semester_id=s.id and c.active) as course_count,
  (select count(*)::integer from public.study_courses c where c.user_id=s.user_id and c.semester_id=s.id and c.active and c.course_kind='major') as major_course_count,
  (select count(*)::integer from public.study_courses c where c.user_id=s.user_id and c.semester_id=s.id and c.active and c.course_kind='retake') as retake_course_count,
  exists(select 1 from public.study_drive_connections d where d.user_id=s.user_id and d.status='connected') as drive_connected,
  exists(select 1 from public.study_drive_connections d where d.user_id=s.user_id and d.status='connected' and d.root_folder_id is not null and d.semester_folder_id is not null and d.inbox_folder_id is not null) as drive_tree_ready,
  exists(select 1 from public.study_calendar_connections k where k.user_id=s.user_id and k.status='connected') as calendar_connected,
  exists(select 1 from public.study_calendar_connections k where k.user_id=s.user_id and k.status='connected' and k.last_sync_at is not null and k.last_sync_status='ok') as calendar_synced,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.timetable_event_count>0) as majors_with_timetable,
  (select count(*)::integer from public.study_baseline_summary b
    where b.user_id=s.user_id and b.semester_id=s.id and b.status='completed'
      and b.skill_count>0 and b.classified_count=b.skill_count) as retake_baselines_completed,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.week1_verified_resource_count>0) as majors_with_week1_material,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.skill_count>0 and a.question_count>0) as majors_with_study_map,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.attempt_count>0) as majors_with_attempts
from public.study_semesters s
where s.active;

revoke all on public.study_activation_snapshot from anon;
grant select on public.study_activation_snapshot to authenticated;
