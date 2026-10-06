alter table public.study_semesters
  add column archived_at timestamptz null,
  add column previous_semester_id uuid null;

update public.study_semesters
set archived_at=coalesce(archived_at,updated_at,now())
where active=false and archived_at is null;

alter table public.study_semesters
  add constraint study_semesters_previous_owner_fk
    foreign key(previous_semester_id,user_id)
    references public.study_semesters(id,user_id)
    on delete restrict,
  add constraint study_semesters_archive_state_check
    check ((active and archived_at is null) or ((not active) and archived_at is not null));

create unique index study_semesters_one_active_per_user
  on public.study_semesters(user_id)
  where active;

create unique index study_semesters_one_rollover_per_source
  on public.study_semesters(user_id,previous_semester_id)
  where previous_semester_id is not null;

create or replace function public.study_rollover_semester(
  p_source_semester_id uuid,
  p_new_stable_key text,
  p_new_display_name text,
  p_starts_on date,
  p_ends_on date default null,
  p_timezone text default null
)
returns jsonb
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_source public.study_semesters%rowtype;
  v_target public.study_semesters%rowtype;
  v_carry_count integer := 0;
  v_courses jsonb := '[]'::jsonb;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if p_new_stable_key is null or p_new_stable_key !~ '^[a-z0-9_]{2,40}$' then raise exception 'invalid semester stable key'; end if;
  if p_new_display_name is null or char_length(btrim(p_new_display_name))<1 or char_length(btrim(p_new_display_name))>80 then raise exception 'invalid semester display name'; end if;
  if p_starts_on is null then raise exception 'new semester start date is required'; end if;
  if p_ends_on is not null and p_ends_on<p_starts_on then raise exception 'semester end date precedes start date'; end if;

  select * into v_source from public.study_semesters
  where id=p_source_semester_id and user_id=v_user for update;
  if not found then raise exception 'source semester not found'; end if;

  select * into v_target from public.study_semesters
  where user_id=v_user and stable_key=p_new_stable_key for update;
  if found then
    if v_target.previous_semester_id=v_source.id and v_target.active and not v_source.active then
      select count(*) into v_carry_count from public.study_courses
      where user_id=v_user and semester_id=v_target.id and course_kind='retake' and active=true;
      select coalesce(jsonb_agg(jsonb_build_object(
        'id',c.id,'stable_key',c.stable_key,'display_name',c.display_name,
        'short_name',c.short_name,'course_kind',c.course_kind,'exam_at',c.exam_at
      ) order by c.sort_order),'[]'::jsonb)
      into v_courses from public.study_courses c
      where c.user_id=v_user and c.semester_id=v_target.id;
      return jsonb_build_object(
        'source_semester_id',v_source.id,'target_semester_id',v_target.id,'idempotent',true,
        'carried_course_count',v_carry_count,'courses',v_courses
      );
    end if;
    raise exception 'semester stable key already exists';
  end if;

  if not v_source.active then raise exception 'source semester is already archived'; end if;
  if exists(select 1 from public.study_semesters s where s.user_id=v_user and s.active and s.id<>v_source.id) then
    raise exception 'another active semester already exists';
  end if;
  if exists(select 1 from public.study_commitments c where c.user_id=v_user and c.semester_id=v_source.id and c.status='open') then
    raise exception 'resolve open semester commitments before rollover';
  end if;

  if exists(
    select 1
    from public.study_courses c
    left join lateral (
      select r.* from public.study_exam_results r
      where r.user_id=v_user and r.course_id=c.id
      order by r.attempt_no desc limit 1
    ) latest_any on true
    left join lateral (
      select r.* from public.study_exam_results r
      where r.user_id=v_user and r.course_id=c.id and r.result_status='official'
      order by r.attempt_no desc limit 1
    ) latest_official on true
    where c.user_id=v_user and c.semester_id=v_source.id
      and (
        latest_official.id is null
        or (latest_any.id is not null and latest_any.attempt_no>latest_official.attempt_no)
        or not (
          latest_official.outcome='passed'
          or (latest_official.outcome in ('failed','absent','withdrawn') and latest_official.retake_decision='declined')
          or (latest_official.outcome in ('failed','absent','withdrawn') and latest_official.retake_decision='pending' and c.exam_at is null)
          or (
            latest_official.outcome in ('failed','absent','withdrawn')
            and latest_official.retake_decision='planned'
            and latest_official.next_exam_at is not null
            and c.exam_at=latest_official.next_exam_at
            and c.exam_at>now()
          )
        )
      )
  ) then
    raise exception 'semester has unresolved academic outcomes';
  end if;

  update public.study_semesters set active=false,archived_at=now(),updated_at=now()
  where id=v_source.id and user_id=v_user;

  update public.study_week_plans set status='completed',updated_at=now()
  where user_id=v_user and semester_id=v_source.id and status='active';

  insert into public.study_semesters(
    user_id,stable_key,display_name,starts_on,ends_on,timezone,
    review_daily_budget_minutes,weekly_checkpoint_minutes,active,archived_at,previous_semester_id
  )
  values(
    v_user,p_new_stable_key,btrim(p_new_display_name),p_starts_on,p_ends_on,
    coalesce(nullif(btrim(p_timezone),''),v_source.timezone),
    v_source.review_daily_budget_minutes,v_source.weekly_checkpoint_minutes,
    true,null,v_source.id
  )
  returning * into v_target;

  insert into public.study_courses(
    user_id,semester_id,stable_key,display_name,short_name,course_kind,
    professor,credits,exam_at,exam_duration_minutes,exam_format,
    drive_folder_id,drive_folder_url,chatgpt_project_ref,sort_order,active,drive_folder_map
  )
  select
    v_user,v_target.id,c.stable_key,c.display_name,c.short_name,'retake'::public.study_course_kind,
    c.professor,c.credits,
    case when latest_official.retake_decision='planned' then latest_official.next_exam_at else null end,
    c.exam_duration_minutes,c.exam_format,
    null,null,null,row_number() over(order by c.sort_order,c.display_name)::smallint,true,'{}'::jsonb
  from public.study_courses c
  join lateral (
    select r.* from public.study_exam_results r
    where r.user_id=v_user and r.course_id=c.id and r.result_status='official'
    order by r.attempt_no desc limit 1
  ) latest_official on true
  where c.user_id=v_user and c.semester_id=v_source.id
    and latest_official.outcome in ('failed','absent','withdrawn')
    and latest_official.retake_decision in ('planned','pending');

  insert into public.study_course_workflow_settings(
    course_id,user_id,expected_lectures_per_week,expects_exercise,expects_solution,
    lecture_retrieval_target_hours,solution_reconcile_target_hours,checkpoint_weight,
    transition_lead_days,exam_mode_lead_days,checkpoint_budget_minutes
  )
  select
    newc.id,v_user,oldset.expected_lectures_per_week,
    coalesce(oldset.expects_exercise,true),coalesce(oldset.expects_solution,true),
    coalesce(oldset.lecture_retrieval_target_hours,24),coalesce(oldset.solution_reconcile_target_hours,48),
    coalesce(oldset.checkpoint_weight,1),coalesce(oldset.transition_lead_days,35),
    coalesce(oldset.exam_mode_lead_days,21),coalesce(oldset.checkpoint_budget_minutes,60)
  from public.study_courses newc
  join public.study_courses oldc on oldc.user_id=v_user and oldc.semester_id=v_source.id and oldc.stable_key=newc.stable_key
  left join public.study_course_workflow_settings oldset on oldset.course_id=oldc.id and oldset.user_id=v_user
  where newc.user_id=v_user and newc.semester_id=v_target.id
  on conflict(course_id) do nothing;

  select count(*) into v_carry_count from public.study_courses
  where user_id=v_user and semester_id=v_target.id and course_kind='retake' and active=true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'stable_key',c.stable_key,'display_name',c.display_name,
    'short_name',c.short_name,'course_kind',c.course_kind,'exam_at',c.exam_at
  ) order by c.sort_order),'[]'::jsonb)
  into v_courses from public.study_courses c
  where c.user_id=v_user and c.semester_id=v_target.id;

  return jsonb_build_object(
    'source_semester_id',v_source.id,'target_semester_id',v_target.id,'idempotent',false,
    'carried_course_count',v_carry_count,'courses',v_courses
  );
end;
$function$;

revoke all on function public.study_rollover_semester(uuid,text,text,date,date,text) from public,anon;
grant execute on function public.study_rollover_semester(uuid,text,text,date,date,text) to authenticated;
