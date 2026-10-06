create or replace function public.study_record_exam_result(
  p_course_id uuid,
  p_attempt_no smallint,
  p_exam_at timestamptz,
  p_result_status text,
  p_outcome text,
  p_grade_text text default null,
  p_score_percent numeric default null,
  p_published_at timestamptz default null,
  p_source_note text default null,
  p_source_url text default null,
  p_readiness_index_snapshot numeric default null,
  p_readiness_band_snapshot text default null,
  p_decision_priority_snapshot numeric default null,
  p_retake_decision text default 'not_applicable',
  p_next_exam_at timestamptz default null
)
returns jsonb
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_course public.study_courses%rowtype;
  v_existing public.study_exam_results%rowtype;
  v_result public.study_exam_results%rowtype;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  select * into v_course from public.study_courses where id=p_course_id and user_id=v_user for update;
  if not found then raise exception 'course not found'; end if;
  if p_attempt_no is null or p_attempt_no<1 or p_attempt_no>10 then raise exception 'attempt number out of range'; end if;
  if p_exam_at is null or p_exam_at>now() then raise exception 'exam result requires a past or current exam timestamp'; end if;
  if p_result_status not in ('provisional','official') then raise exception 'invalid result status'; end if;
  if p_outcome not in ('passed','failed','absent','withdrawn') then raise exception 'invalid exam outcome'; end if;
  if p_score_percent is not null and (p_score_percent<0 or p_score_percent>100) then raise exception 'score percent out of range'; end if;
  if p_outcome='passed' and (p_retake_decision<>'not_applicable' or p_next_exam_at is not null) then raise exception 'passed results cannot have a retake'; end if;
  if p_outcome in ('failed','absent','withdrawn') and p_retake_decision not in ('pending','planned','declined') then raise exception 'non-passing results require a retake decision'; end if;
  if p_retake_decision='planned' and (p_next_exam_at is null or p_next_exam_at<=p_exam_at or p_next_exam_at<=now()) then raise exception 'planned retake requires a future exam timestamp after the completed attempt'; end if;
  if p_retake_decision<>'planned' and p_next_exam_at is not null then raise exception 'next exam timestamp is allowed only for a planned retake'; end if;

  select * into v_existing from public.study_exam_results
  where user_id=v_user and course_id=p_course_id and attempt_no=p_attempt_no for update;
  if found and v_existing.result_status='official' and p_result_status='provisional' then raise exception 'official result cannot be downgraded to provisional'; end if;

  insert into public.study_exam_results(
    user_id,semester_id,course_id,attempt_no,exam_at,result_status,outcome,grade_text,score_percent,published_at,
    source_note,source_url,readiness_index_snapshot,readiness_band_snapshot,decision_priority_snapshot,
    retake_decision,next_exam_at,updated_at
  )
  values(
    v_user,v_course.semester_id,p_course_id,p_attempt_no,p_exam_at,p_result_status,p_outcome,
    nullif(btrim(p_grade_text),''),p_score_percent,p_published_at,nullif(btrim(p_source_note),''),
    nullif(btrim(p_source_url),''),p_readiness_index_snapshot,nullif(btrim(p_readiness_band_snapshot),''),
    p_decision_priority_snapshot,p_retake_decision,p_next_exam_at,now()
  )
  on conflict(user_id,course_id,attempt_no) do update set
    exam_at=excluded.exam_at,result_status=excluded.result_status,outcome=excluded.outcome,
    grade_text=excluded.grade_text,score_percent=excluded.score_percent,published_at=excluded.published_at,
    source_note=excluded.source_note,source_url=excluded.source_url,
    readiness_index_snapshot=coalesce(public.study_exam_results.readiness_index_snapshot,excluded.readiness_index_snapshot),
    readiness_band_snapshot=coalesce(public.study_exam_results.readiness_band_snapshot,excluded.readiness_band_snapshot),
    decision_priority_snapshot=coalesce(public.study_exam_results.decision_priority_snapshot,excluded.decision_priority_snapshot),
    retake_decision=excluded.retake_decision,next_exam_at=excluded.next_exam_at,updated_at=now()
  returning * into v_result;

  if p_result_status='official' then
    if p_outcome='passed' then
      update public.study_courses set active=false,exam_at=p_exam_at,updated_at=now() where id=p_course_id and user_id=v_user;
    elsif p_retake_decision='planned' then
      update public.study_courses set active=true,course_kind='retake',exam_at=p_next_exam_at,updated_at=now() where id=p_course_id and user_id=v_user;
    elsif p_retake_decision='pending' then
      update public.study_courses set active=true,course_kind='retake',exam_at=null,updated_at=now() where id=p_course_id and user_id=v_user;
    elsif p_retake_decision='declined' then
      update public.study_courses set active=false,course_kind='retake',exam_at=null,updated_at=now() where id=p_course_id and user_id=v_user;
    end if;
  end if;

  return jsonb_build_object(
    'result_id',v_result.id,'course_id',v_result.course_id,'attempt_no',v_result.attempt_no,
    'result_status',v_result.result_status,'outcome',v_result.outcome,'retake_decision',v_result.retake_decision,
    'next_exam_at',v_result.next_exam_at,
    'course_active',case when p_result_status<>'official' then v_course.active when p_outcome='passed' then false when p_retake_decision='declined' then false else true end
  );
end;
$function$;

revoke all on function public.study_record_exam_result(
  uuid,smallint,timestamptz,text,text,text,numeric,timestamptz,text,text,numeric,text,numeric,text,timestamptz
) from public,anon;
grant execute on function public.study_record_exam_result(
  uuid,smallint,timestamptz,text,text,text,numeric,timestamptz,text,text,numeric,text,numeric,text,timestamptz
) to authenticated;
