alter table public.study_semesters
  add column if not exists drive_semester_folder_id text,
  add column if not exists drive_semester_folder_url text;

create or replace view public.study_activation_snapshot
with (security_invoker=true)
as
select
  s.user_id,s.id as semester_id,s.stable_key,s.starts_on,s.ends_on,s.timezone,
  (select count(*)::integer from public.study_courses c where c.user_id=s.user_id and c.semester_id=s.id and c.active) as course_count,
  (select count(*)::integer from public.study_courses c where c.user_id=s.user_id and c.semester_id=s.id and c.active and c.course_kind='major') as major_course_count,
  (select count(*)::integer from public.study_courses c where c.user_id=s.user_id and c.semester_id=s.id and c.active and c.course_kind='retake') as retake_course_count,
  exists(select 1 from public.study_drive_connections d where d.user_id=s.user_id and d.status='connected') as drive_connected,
  (s.drive_semester_folder_id is not null and s.drive_inbox_folder_id is not null and not exists(
    select 1 from public.study_courses c where c.user_id=s.user_id and c.semester_id=s.id and c.active and c.drive_folder_id is null
  )) as drive_tree_ready,
  exists(select 1 from public.study_calendar_connections k where k.user_id=s.user_id and k.status='connected') as calendar_connected,
  exists(select 1 from public.study_calendar_connections k where k.user_id=s.user_id and k.status='connected' and k.last_sync_at is not null and k.last_sync_status='ok') as calendar_synced,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.timetable_event_count>0) as majors_with_timetable,
  (select count(*)::integer from public.study_baseline_summary b join public.study_courses c on c.id=b.course_id and c.user_id=b.user_id
    where b.user_id=s.user_id and b.semester_id=s.id and c.active and c.course_kind='retake' and b.status='completed' and b.skill_count>0 and b.classified_count=b.skill_count) as retake_baselines_completed,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.week1_verified_resource_count>0) as majors_with_week1_material,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.skill_count>0 and a.question_count>0) as majors_with_study_map,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.attempt_count>0) as majors_with_attempts
from public.study_semesters s where s.active;

create or replace function public.study_certify_semester_bootstrap()
returns jsonb language plpgsql set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid()); v_semester public.study_semesters%rowtype; v_course_count integer;
  v_missing_workflow integer; v_missing_drive integer; v_missing_curriculum integer; v_missing_baseline integer; v_drive_connected boolean;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  select * into v_semester from public.study_semesters where user_id=v_user and active for update;
  if not found then raise exception 'active semester not found'; end if;
  select count(*) into v_course_count from public.study_courses where user_id=v_user and semester_id=v_semester.id and active;
  if v_course_count=0 then raise exception 'add at least one active course before certification'; end if;
  select count(*) into v_missing_workflow from public.study_courses c left join public.study_course_workflow_settings w on w.course_id=c.id and w.user_id=c.user_id
    where c.user_id=v_user and c.semester_id=v_semester.id and c.active and w.course_id is null;
  select exists(select 1 from public.study_drive_connections d where d.user_id=v_user and d.status='connected') into v_drive_connected;
  if not v_drive_connected then raise exception 'connect Study Drive before certification'; end if;
  if v_semester.drive_semester_folder_id is null or v_semester.drive_inbox_folder_id is null then raise exception 'provision the active semester Drive tree before certification'; end if;
  select count(*) into v_missing_drive from public.study_courses c where c.user_id=v_user and c.semester_id=v_semester.id and c.active and c.drive_folder_id is null;
  select count(*) into v_missing_curriculum from public.study_courses c where c.user_id=v_user and c.semester_id=v_semester.id and c.active and (
    not exists(select 1 from public.study_resources r where r.user_id=v_user and r.course_id=c.id and r.active and r.processing_status='verified')
    or not exists(select 1 from public.study_skills s where s.user_id=v_user and s.course_id=c.id and s.active)
    or not exists(select 1 from public.study_questions q where q.user_id=v_user and q.course_id=c.id and q.active)
  );
  select count(*) into v_missing_baseline from public.study_courses c where c.user_id=v_user and c.semester_id=v_semester.id and c.active and c.course_kind='retake'
    and not exists(select 1 from public.study_baseline_diagnostics b where b.user_id=v_user and b.course_id=c.id and b.status='completed');
  if v_missing_workflow>0 then raise exception '% course(s) lack workflow settings',v_missing_workflow; end if;
  if v_missing_drive>0 then raise exception '% course(s) lack active-semester Drive folders',v_missing_drive; end if;
  if v_missing_curriculum>0 then raise exception '% course(s) lack verified curriculum resources/skills/questions',v_missing_curriculum; end if;
  if v_missing_baseline>0 then raise exception '% retake course(s) lack completed baseline diagnostics',v_missing_baseline; end if;
  update public.study_semesters set bootstrap_certified_at=now(),updated_at=now() where id=v_semester.id and user_id=v_user;
  return jsonb_build_object('semester_id',v_semester.id,'certified',true,'course_count',v_course_count,'certified_at',now());
end;
$function$;
revoke all on function public.study_certify_semester_bootstrap() from public,anon;
grant execute on function public.study_certify_semester_bootstrap() to authenticated;
