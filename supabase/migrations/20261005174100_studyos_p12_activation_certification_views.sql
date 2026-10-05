create or replace view public.study_activation_course_status
with (security_invoker=true)
as
select
  c.user_id,
  c.semester_id,
  c.id as course_id,
  c.stable_key,
  c.display_name,
  c.short_name,
  c.course_kind,
  c.sort_order,
  (c.drive_folder_id is not null) as drive_folder_ready,
  (c.exam_at is not null) as exam_date_configured,
  coalesce((
    select count(*)::integer
    from public.study_calendar_events e
    where e.user_id=c.user_id and e.course_id=c.id
      and e.status is distinct from 'cancelled'
      and e.event_role in ('lecture','exercise','exam','deadline')
  ),0) as timetable_event_count,
  coalesce((
    select count(*)::integer
    from public.study_resources r
    where r.user_id=c.user_id and r.course_id=c.id and r.active
  ),0) as resource_count,
  coalesce((
    select count(*)::integer
    from public.study_resources r
    join public.study_teaching_weeks w on w.id=r.teaching_week_id and w.user_id=r.user_id
    where r.user_id=c.user_id and r.course_id=c.id and r.active and w.week_no=1
  ),0) as week1_resource_count,
  coalesce((
    select count(*)::integer
    from public.study_resources r
    join public.study_teaching_weeks w on w.id=r.teaching_week_id and w.user_id=r.user_id
    where r.user_id=c.user_id and r.course_id=c.id and r.active and w.week_no=1
      and r.processing_status='verified'
  ),0) as week1_verified_resource_count,
  coalesce((
    select count(*)::integer from public.study_topics t
    where t.user_id=c.user_id and t.course_id=c.id and t.active
  ),0) as topic_count,
  coalesce((
    select count(*)::integer from public.study_skills s
    where s.user_id=c.user_id and s.course_id=c.id and s.active
  ),0) as skill_count,
  coalesce((
    select count(*)::integer from public.study_questions q
    where q.user_id=c.user_id and q.course_id=c.id and q.active
  ),0) as question_count,
  coalesce((
    select count(*)::integer from public.study_attempts a
    where a.user_id=c.user_id and a.course_id=c.id
  ),0) as attempt_count,
  coalesce((
    select bs.status from public.study_baseline_summary bs
    where bs.user_id=c.user_id and bs.course_id=c.id
  ),'not_started'::public.study_baseline_status) as baseline_status,
  coalesce((
    select bs.classified_count from public.study_baseline_summary bs
    where bs.user_id=c.user_id and bs.course_id=c.id
  ),0) as baseline_classified_count,
  coalesce((
    select bs.skill_count from public.study_baseline_summary bs
    where bs.user_id=c.user_id and bs.course_id=c.id
  ),0) as baseline_skill_count
from public.study_courses c
where c.active;

revoke all on public.study_activation_course_status from anon;
grant select on public.study_activation_course_status to authenticated;

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
  (select count(*)::integer from public.study_baseline_summary b where b.user_id=s.user_id and b.semester_id=s.id and b.status='completed') as retake_baselines_completed,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.week1_verified_resource_count>0) as majors_with_week1_material,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.skill_count>0 and a.question_count>0) as majors_with_study_map,
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.attempt_count>0) as majors_with_attempts
from public.study_semesters s
where s.active;

revoke all on public.study_activation_snapshot from anon;
grant select on public.study_activation_snapshot to authenticated;
