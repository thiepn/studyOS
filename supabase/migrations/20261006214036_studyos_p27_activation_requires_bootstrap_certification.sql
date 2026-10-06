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
  (select count(*)::integer from public.study_activation_course_status a where a.user_id=s.user_id and a.semester_id=s.id and a.course_kind='major' and a.attempt_count>0) as majors_with_attempts,
  (s.bootstrap_certified_at is not null) as bootstrap_certified
from public.study_semesters s where s.active;
