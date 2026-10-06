create or replace function public.study_historical_prior_snapshot(p_source_course_id uuid)
returns jsonb language sql stable set search_path to 'public','pg_temp'
as $function$
  select jsonb_build_object(
    'source_course_id',c.id,'source_semester_id',c.semester_id,'stable_key',c.stable_key,'display_name',c.display_name,
    'short_name',c.short_name,'course_kind',c.course_kind,'credits',c.credits,
    'official_attempts',(select count(*) from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official'),
    'latest_outcome',(select r.outcome from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_grade_text',(select r.grade_text from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_score_percent',(select r.score_percent from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_readiness_index',(select r.readiness_index_snapshot from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_readiness_band',(select r.readiness_band_snapshot from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'skill_count',(select count(*) from public.study_skills s where s.user_id=(select auth.uid()) and s.course_id=c.id and s.active),
    'unresolved_findings',(select count(*) from public.study_reconciliation_findings f where f.user_id=(select auth.uid()) and f.course_id=c.id and f.status in ('open','repair_scheduled'))
  )
  from public.study_courses c where c.id=p_source_course_id and c.user_id=(select auth.uid());
$function$;
revoke all on function public.study_historical_prior_snapshot(uuid) from public,anon;
grant execute on function public.study_historical_prior_snapshot(uuid) to authenticated;

drop function if exists public.study_historical_prior_snapshot(uuid,uuid);

update public.study_semesters
set bootstrap_certified_at=coalesce(bootstrap_certified_at,now()),updated_at=now()
where active and previous_semester_id is null;
