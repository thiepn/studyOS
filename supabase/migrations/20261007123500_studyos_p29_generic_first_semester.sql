-- P29: generic first-semester creation.
-- Replaces application use of the legacy study_initialize_ws2627() bootstrap without
-- deleting that historical RPC, so older migrations/deployments remain inspectable.

create or replace function public.study_create_initial_semester(
  p_stable_key text,
  p_display_name text,
  p_starts_on date,
  p_ends_on date default null,
  p_timezone text default 'Europe/Berlin'
)
returns jsonb
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_semester public.study_semesters%rowtype;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  if exists(select 1 from public.study_semesters where user_id=v_user) then
    raise exception 'initial semester can only be created before semester history exists';
  end if;
  if p_stable_key is null or p_stable_key !~ '^[a-z0-9_]{2,40}$' then
    raise exception 'invalid semester stable key';
  end if;
  if p_display_name is null or char_length(btrim(p_display_name))<1 or char_length(btrim(p_display_name))>80 then
    raise exception 'invalid semester display name';
  end if;
  if p_starts_on is null then raise exception 'semester start date is required'; end if;
  if p_ends_on is not null and p_ends_on<p_starts_on then raise exception 'semester end date precedes start date'; end if;
  if p_timezone is null or char_length(btrim(p_timezone))<1 or char_length(btrim(p_timezone))>80 then
    raise exception 'invalid semester timezone';
  end if;

  insert into public.study_semesters(
    user_id,stable_key,display_name,starts_on,ends_on,timezone,
    review_daily_budget_minutes,weekly_checkpoint_minutes,active,archived_at,previous_semester_id
  )
  values(
    v_user,p_stable_key,btrim(p_display_name),p_starts_on,p_ends_on,btrim(p_timezone),
    40,60,true,null,null
  )
  returning * into v_semester;

  return jsonb_build_object(
    'semester_id',v_semester.id,
    'stable_key',v_semester.stable_key,
    'display_name',v_semester.display_name,
    'starts_on',v_semester.starts_on,
    'ends_on',v_semester.ends_on,
    'timezone',v_semester.timezone
  );
end;
$function$;

revoke all on function public.study_create_initial_semester(text,text,date,date,text) from public,anon;
grant execute on function public.study_create_initial_semester(text,text,date,date,text) to authenticated;
