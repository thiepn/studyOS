create or replace view public.study_current_capacity
with (security_invoker=true)
as
WITH active_semester AS (
         SELECT s.id,
            s.user_id,
            s.stable_key,
            s.display_name,
            s.starts_on,
            s.ends_on,
            s.timezone,
            s.review_daily_budget_minutes,
            s.weekly_checkpoint_minutes,
            s.active,
            s.created_at,
            s.updated_at,
            s.drive_root_folder_id,
            s.drive_root_folder_url,
            s.drive_inbox_folder_id,
            s.drive_inbox_folder_url,
            s.drive_last_scan_at,
            s.drive_last_scan_status,
            s.drive_last_scan_note,
            (now() AT TIME ZONE COALESCE(NULLIF(s.timezone, ''::text), 'Europe/Berlin'::text))::date AS local_today
           FROM study_semesters s
          WHERE s.active
        ), base AS (
         SELECT s.user_id,
            s.id AS semester_id,
            s.timezone,
            s.local_today,
            COALESCE(d.mode, p.default_mode, 'normal'::study_capacity_mode) AS mode,
            d.custom_budget_minutes,
            d.note AS daily_note,
            COALESCE(p.normal_budget_minutes::integer, 120) AS normal_budget_minutes,
            COALESCE(p.light_budget_minutes::integer, 75) AS light_budget_minutes,
            COALESCE(p.recovery_budget_minutes::integer, 45) AS recovery_budget_minutes,
            COALESCE(p.intensive_budget_minutes::integer, 180) AS intensive_budget_minutes,
            COALESCE(p.light_review_budget_minutes::integer, 30) AS light_review_budget_minutes,
            COALESCE(p.recovery_review_budget_minutes::integer, 20) AS recovery_review_budget_minutes,
            COALESCE(p.max_focus_items::integer, 4) AS max_focus_items,
            COALESCE(p.recovery_max_focus_items::integer, 2) AS recovery_max_focus_items,
            s.review_daily_budget_minutes
           FROM active_semester s
             LEFT JOIN study_planning_settings p ON p.user_id = s.user_id AND p.semester_id = s.id
             LEFT JOIN study_daily_capacity d ON d.user_id = s.user_id AND d.semester_id = s.id AND d.plan_date = s.local_today
        )
 SELECT user_id,
    semester_id,
    timezone,
    local_today,
    mode,
    custom_budget_minutes,
    daily_note,
    normal_budget_minutes,
    light_budget_minutes,
    recovery_budget_minutes,
    intensive_budget_minutes,
    light_review_budget_minutes,
    recovery_review_budget_minutes,
    max_focus_items,
    recovery_max_focus_items,
    review_daily_budget_minutes,
        CASE mode
            WHEN 'light'::study_capacity_mode THEN light_budget_minutes
            WHEN 'recovery'::study_capacity_mode THEN recovery_budget_minutes
            WHEN 'intensive'::study_capacity_mode THEN intensive_budget_minutes
            WHEN 'custom'::study_capacity_mode THEN COALESCE(custom_budget_minutes::integer, normal_budget_minutes)
            ELSE normal_budget_minutes
        END AS total_budget_minutes,
    LEAST(review_daily_budget_minutes::integer,
        CASE mode
            WHEN 'light'::study_capacity_mode THEN light_review_budget_minutes
            WHEN 'recovery'::study_capacity_mode THEN recovery_review_budget_minutes
            WHEN 'custom'::study_capacity_mode THEN COALESCE(custom_budget_minutes::integer, normal_budget_minutes)
            ELSE review_daily_budget_minutes::integer
        END) AS effective_review_budget_minutes,
        CASE
            WHEN mode = 'recovery'::study_capacity_mode THEN recovery_max_focus_items
            ELSE max_focus_items
        END AS effective_max_focus_items
   FROM base b;
revoke all on public.study_current_capacity from anon;
grant select on public.study_current_capacity to authenticated;

CREATE OR REPLACE FUNCTION public.study_create_commitment(p_title text, p_due_at timestamp with time zone, p_estimated_minutes smallint, p_kind study_commitment_kind DEFAULT 'deadline'::study_commitment_kind, p_course_id uuid DEFAULT NULL::uuid, p_priority smallint DEFAULT 3, p_resource_id uuid DEFAULT NULL::uuid, p_source_url text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_semester uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce(((select auth.jwt())->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if length(btrim(coalesce(p_title,''))) not between 1 and 240 then raise exception 'title required'; end if;
  if p_estimated_minutes not between 5 and 720 then raise exception 'estimated minutes out of range'; end if;
  if p_priority not between 1 and 5 then raise exception 'priority out of range'; end if;
  if p_source_url is not null and p_source_url !~ '^https://' then raise exception 'source URL must use https'; end if;

  select id into v_semester from public.study_semesters where user_id=v_user and active order by starts_on desc limit 1;
  if v_semester is null then raise exception 'active semester not found'; end if;
  if p_course_id is not null and not exists(
    select 1 from public.study_courses c where c.id=p_course_id and c.user_id=v_user and c.semester_id=v_semester and c.active
  ) then raise exception 'course not found'; end if;
  if p_resource_id is not null and not exists(
    select 1 from public.study_resources r where r.id=p_resource_id and r.user_id=v_user and (p_course_id is null or r.course_id=p_course_id)
  ) then raise exception 'resource not found'; end if;

  insert into public.study_commitments(
    user_id,semester_id,course_id,resource_id,kind,title,due_at,estimated_minutes,priority,source_url,note
  ) values(
    v_user,v_semester,p_course_id,p_resource_id,p_kind,btrim(p_title),p_due_at,p_estimated_minutes,p_priority,
    nullif(left(coalesce(p_source_url,''),2000),''),nullif(left(coalesce(p_note,''),4000),'')
  ) returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_set_commitment_status(p_id uuid, p_status study_commitment_status)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce(((select auth.jwt())->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  update public.study_commitments
  set status=p_status,
      completed_at=case when p_status='completed' then now() else null end,
      updated_at=now()
  where id=p_id and user_id=v_user;
  if not found then raise exception 'commitment not found'; end if;
  return jsonb_build_object('id',p_id,'status',p_status);
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_set_daily_capacity(p_mode study_capacity_mode, p_custom_budget_minutes smallint DEFAULT NULL::smallint, p_plan_date date DEFAULT NULL::date, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_semester public.study_semesters%rowtype;
  v_date date;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce(((select auth.jwt())->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  select * into v_semester from public.study_semesters
  where user_id=v_user and active
  order by starts_on desc limit 1;
  if not found then raise exception 'active semester not found'; end if;

  v_date:=coalesce(p_plan_date,(now() at time zone coalesce(nullif(v_semester.timezone,''),'Europe/Berlin'))::date);
  if p_mode='custom' and (p_custom_budget_minutes is null or p_custom_budget_minutes not between 15 and 720) then
    raise exception 'custom budget must be 15–720 minutes';
  end if;
  if p_mode<>'custom' then p_custom_budget_minutes:=null; end if;

  insert into public.study_daily_capacity(user_id,semester_id,plan_date,mode,custom_budget_minutes,note)
  values(v_user,v_semester.id,v_date,p_mode,p_custom_budget_minutes,nullif(left(coalesce(p_note,''),1000),''))
  on conflict(user_id,semester_id,plan_date) do update
    set mode=excluded.mode,custom_budget_minutes=excluded.custom_budget_minutes,note=excluded.note,updated_at=now();

  return jsonb_build_object('plan_date',v_date,'mode',p_mode,'custom_budget_minutes',p_custom_budget_minutes);
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_update_planning_settings(p_normal_budget_minutes smallint, p_light_budget_minutes smallint, p_recovery_budget_minutes smallint, p_intensive_budget_minutes smallint, p_light_review_budget_minutes smallint, p_recovery_review_budget_minutes smallint, p_max_focus_items smallint, p_recovery_max_focus_items smallint, p_default_mode study_capacity_mode DEFAULT 'normal'::study_capacity_mode)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_semester uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce(((select auth.jwt())->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if p_default_mode='custom' then raise exception 'custom cannot be the default mode'; end if;
  if p_normal_budget_minutes not between 15 and 720 or p_light_budget_minutes not between 15 and 720
     or p_recovery_budget_minutes not between 15 and 720 or p_intensive_budget_minutes not between 15 and 720
     or p_light_review_budget_minutes not between 5 and 120 or p_recovery_review_budget_minutes not between 5 and 120
     or p_max_focus_items not between 1 and 12 or p_recovery_max_focus_items not between 1 and 6 then
    raise exception 'planning settings out of range';
  end if;

  select id into v_semester from public.study_semesters where user_id=v_user and active order by starts_on desc limit 1;
  if v_semester is null then raise exception 'active semester not found'; end if;

  insert into public.study_planning_settings(
    user_id,semester_id,default_mode,normal_budget_minutes,light_budget_minutes,recovery_budget_minutes,
    intensive_budget_minutes,light_review_budget_minutes,recovery_review_budget_minutes,max_focus_items,recovery_max_focus_items
  ) values(
    v_user,v_semester,p_default_mode,p_normal_budget_minutes,p_light_budget_minutes,p_recovery_budget_minutes,
    p_intensive_budget_minutes,p_light_review_budget_minutes,p_recovery_review_budget_minutes,p_max_focus_items,p_recovery_max_focus_items
  )
  on conflict(user_id,semester_id) do update set
    default_mode=excluded.default_mode,normal_budget_minutes=excluded.normal_budget_minutes,
    light_budget_minutes=excluded.light_budget_minutes,recovery_budget_minutes=excluded.recovery_budget_minutes,
    intensive_budget_minutes=excluded.intensive_budget_minutes,light_review_budget_minutes=excluded.light_review_budget_minutes,
    recovery_review_budget_minutes=excluded.recovery_review_budget_minutes,max_focus_items=excluded.max_focus_items,
    recovery_max_focus_items=excluded.recovery_max_focus_items,updated_at=now();

  return jsonb_build_object('semester_id',v_semester,'default_mode',p_default_mode);
end;
$function$;


revoke all on function public.study_set_daily_capacity(public.study_capacity_mode,smallint,date,text) from public,anon;
grant execute on function public.study_set_daily_capacity(public.study_capacity_mode,smallint,date,text) to authenticated;
revoke all on function public.study_update_planning_settings(smallint,smallint,smallint,smallint,smallint,smallint,smallint,smallint,public.study_capacity_mode) from public,anon;
grant execute on function public.study_update_planning_settings(smallint,smallint,smallint,smallint,smallint,smallint,smallint,smallint,public.study_capacity_mode) to authenticated;
revoke all on function public.study_create_commitment(text,timestamptz,smallint,public.study_commitment_kind,uuid,smallint,uuid,text,text) from public,anon;
grant execute on function public.study_create_commitment(text,timestamptz,smallint,public.study_commitment_kind,uuid,smallint,uuid,text,text) to authenticated;
revoke all on function public.study_set_commitment_status(uuid,public.study_commitment_status) from public,anon;
grant execute on function public.study_set_commitment_status(uuid,public.study_commitment_status) to authenticated;
