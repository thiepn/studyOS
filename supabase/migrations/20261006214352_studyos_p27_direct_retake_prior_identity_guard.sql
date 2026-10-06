create or replace function public.study_attach_historical_prior(
  p_course_id uuid,
  p_source_course_id uuid,
  p_relation text,
  p_note text default null
)
returns jsonb
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_target public.study_courses%rowtype;
  v_source public.study_courses%rowtype;
  v_source_semester public.study_semesters%rowtype;
  v_snapshot jsonb;
  v_prior_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if p_relation not in ('direct_retake','prerequisite','related') then raise exception 'invalid prior relation'; end if;
  if p_note is not null and char_length(p_note)>1000 then raise exception 'prior note too long'; end if;
  select c.* into v_target
  from public.study_courses c join public.study_semesters s on s.id=c.semester_id and s.user_id=c.user_id
  where c.id=p_course_id and c.user_id=v_user and c.active and s.active;
  if not found then raise exception 'target course not found in active semester'; end if;
  select * into v_source from public.study_courses where id=p_source_course_id and user_id=v_user;
  if not found then raise exception 'source course not found'; end if;
  select * into v_source_semester from public.study_semesters where id=v_source.semester_id and user_id=v_user;
  if not found or v_source_semester.active or v_source_semester.archived_at is null then raise exception 'source course must belong to an archived semester'; end if;
  if p_relation='direct_retake' and v_source.stable_key<>v_target.stable_key then
    raise exception 'direct retake prior requires the same stable course key';
  end if;
  v_snapshot:=public.study_historical_prior_snapshot(v_source.id);
  if v_snapshot is null then raise exception 'could not build prior snapshot'; end if;
  insert into public.study_course_historical_priors(
    user_id,semester_id,course_id,source_semester_id,source_course_id,relation,note,source_snapshot
  )
  values(v_user,v_target.semester_id,v_target.id,v_source.semester_id,v_source.id,p_relation,nullif(btrim(p_note),''),v_snapshot)
  on conflict(user_id,course_id,source_course_id) do update set
    relation=excluded.relation,note=excluded.note,updated_at=now()
  returning id into v_prior_id;
  update public.study_semesters set bootstrap_certified_at=null,updated_at=now()
  where id=v_target.semester_id and user_id=v_user;
  return jsonb_build_object('prior_id',v_prior_id,'course_id',v_target.id,'source_course_id',v_source.id);
end;
$function$;
revoke all on function public.study_attach_historical_prior(uuid,uuid,text,text) from public,anon;
grant execute on function public.study_attach_historical_prior(uuid,uuid,text,text) to authenticated;
