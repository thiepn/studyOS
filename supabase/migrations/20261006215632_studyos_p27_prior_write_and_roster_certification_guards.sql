create or replace function public.study_guard_historical_prior_write()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_target public.study_courses%rowtype;
  v_source public.study_courses%rowtype;
  v_target_semester public.study_semesters%rowtype;
  v_source_semester public.study_semesters%rowtype;
  v_snapshot jsonb;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  if tg_op='DELETE' then
    if old.user_id<>v_user then raise exception 'prior not owned by current user'; end if;
    select * into v_target_semester from public.study_semesters
      where id=old.semester_id and user_id=v_user;
    if not found or not v_target_semester.active then raise exception 'archived historical priors are read only'; end if;
    update public.study_semesters set bootstrap_certified_at=null,updated_at=now()
      where id=old.semester_id and user_id=v_user and active;
    return old;
  end if;

  if new.relation not in ('direct_retake','prerequisite','related') then raise exception 'invalid prior relation'; end if;
  if new.note is not null and char_length(new.note)>1000 then raise exception 'prior note too long'; end if;

  if tg_op='UPDATE' then
    if old.user_id<>v_user then raise exception 'prior not owned by current user'; end if;
    if new.user_id is distinct from old.user_id
      or new.semester_id is distinct from old.semester_id
      or new.course_id is distinct from old.course_id
      or new.source_semester_id is distinct from old.source_semester_id
      or new.source_course_id is distinct from old.source_course_id
      or new.source_snapshot is distinct from old.source_snapshot
    then raise exception 'historical prior identity and snapshot are immutable'; end if;

    select * into v_target from public.study_courses where id=old.course_id and user_id=v_user;
    if not found then raise exception 'target course not found'; end if;
    select * into v_target_semester from public.study_semesters where id=v_target.semester_id and user_id=v_user;
    if not found or not v_target_semester.active then raise exception 'archived historical priors are read only'; end if;
    select * into v_source from public.study_courses where id=old.source_course_id and user_id=v_user;
    if not found then raise exception 'source course not found'; end if;
    if new.relation='direct_retake' and v_source.stable_key<>v_target.stable_key then
      raise exception 'direct retake prior requires the same stable course key';
    end if;
    new.note:=nullif(btrim(new.note),'');
    new.updated_at:=now();
    update public.study_semesters set bootstrap_certified_at=null,updated_at=now()
      where id=v_target.semester_id and user_id=v_user and active;
    return new;
  end if;

  select c.* into v_target
  from public.study_courses c
  join public.study_semesters s on s.id=c.semester_id and s.user_id=c.user_id
  where c.id=new.course_id and c.user_id=v_user and c.active and s.active;
  if not found then raise exception 'target course not found in active semester'; end if;

  select * into v_source from public.study_courses where id=new.source_course_id and user_id=v_user;
  if not found then raise exception 'source course not found'; end if;
  select * into v_source_semester from public.study_semesters where id=v_source.semester_id and user_id=v_user;
  if not found or v_source_semester.active or v_source_semester.archived_at is null then
    raise exception 'source course must belong to an archived semester';
  end if;
  if new.relation='direct_retake' and v_source.stable_key<>v_target.stable_key then
    raise exception 'direct retake prior requires the same stable course key';
  end if;

  v_snapshot:=public.study_historical_prior_snapshot(v_source.id);
  if v_snapshot is null then raise exception 'could not build prior snapshot'; end if;

  new.user_id:=v_user;
  new.semester_id:=v_target.semester_id;
  new.source_semester_id:=v_source.semester_id;
  new.source_snapshot:=v_snapshot;
  new.note:=nullif(btrim(new.note),'');
  new.updated_at:=now();

  update public.study_semesters set bootstrap_certified_at=null,updated_at=now()
    where id=v_target.semester_id and user_id=v_user and active;
  return new;
end;
$function$;

drop trigger if exists study_course_historical_priors_guard on public.study_course_historical_priors;
create trigger study_course_historical_priors_guard
before insert or update or delete on public.study_course_historical_priors
for each row execute function public.study_guard_historical_prior_write();

create or replace function public.study_invalidate_bootstrap_on_course_roster_change()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_semester uuid;
  v_user uuid;
begin
  v_semester:=case when tg_op='DELETE' then old.semester_id else new.semester_id end;
  v_user:=case when tg_op='DELETE' then old.user_id else new.user_id end;
  update public.study_semesters set bootstrap_certified_at=null,updated_at=now()
    where id=v_semester and user_id=v_user and active;
  return case when tg_op='DELETE' then old else new end;
end;
$function$;

drop trigger if exists study_courses_invalidate_bootstrap_on_roster_change on public.study_courses;
create trigger study_courses_invalidate_bootstrap_on_roster_change
after insert or delete on public.study_courses
for each row execute function public.study_invalidate_bootstrap_on_course_roster_change();
