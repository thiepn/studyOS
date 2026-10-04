-- P6 migration already applied to the shared THIEPN Account project.
-- Earlier StudyOS P0-P5 schema predates repository migration capture; see docs/P6.md.

create or replace function public.study_initialize_ws2627()
returns jsonb
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_semester uuid;
  v_courses jsonb;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  insert into public.study_semesters(user_id,stable_key,display_name,starts_on,ends_on,timezone,review_daily_budget_minutes,weekly_checkpoint_minutes,active)
  values(v_user,'ws26_27','WS26/27',date '2026-10-12',null,'Europe/Berlin',40,60,true)
  on conflict(user_id,stable_key) do update set updated_at=now();

  select id into v_semester from public.study_semesters where user_id=v_user and stable_key='ws26_27';

  insert into public.study_courses(user_id,semester_id,stable_key,display_name,short_name,course_kind,sort_order,active)
  values
    (v_user,v_semester,'major_01','Differentialgleichungen','DGL','major',1,true),
    (v_user,v_semester,'major_02','Einführung in die Stochastik','Stochastik','major',2,true),
    (v_user,v_semester,'major_03','Theoretische Informatik','TheoInf','major',3,true),
    (v_user,v_semester,'major_04','Algorithmische Mathematik und Programmieren','AMP','major',4,true),
    (v_user,v_semester,'programming_retake','Einführung in die Programmierung','EiP','retake',5,true),
    (v_user,v_semester,'microeconomics_retake','Grundzüge der Mikroökonomik','Mikro','retake',6,true)
  on conflict(semester_id,stable_key) do update set
    sort_order=excluded.sort_order, active=true,
    display_name=case when public.study_courses.display_name in ('Major Course 01','Major Course 02','Major Course 03','Major Course 04','Programming','Microeconomics') then excluded.display_name else public.study_courses.display_name end,
    short_name=case when public.study_courses.short_name in ('M1','M2','M3','M4','Programming','Micro') then excluded.short_name else public.study_courses.short_name end,
    updated_at=now();

  insert into public.study_course_workflow_settings(course_id,user_id,expects_exercise,expects_solution)
  select id,user_id,true,true from public.study_courses where user_id=v_user and semester_id=v_semester
  on conflict(course_id) do nothing;

  select jsonb_agg(jsonb_build_object('id',id,'stable_key',stable_key,'display_name',display_name,'course_kind',course_kind,'sort_order',sort_order) order by sort_order)
  into v_courses from public.study_courses where user_id=v_user and semester_id=v_semester;

  return jsonb_build_object(
    'semester_id',v_semester,'stable_key','ws26_27',
    'drive_connected',exists(select 1 from public.study_drive_connections where user_id=v_user and status='connected'),
    'courses',coalesce(v_courses,'[]'::jsonb)
  );
end;
$function$;

revoke all on function public.study_initialize_ws2627() from public,anon;
grant execute on function public.study_initialize_ws2627() to authenticated;

create or replace function public.study_readiness_snapshot()
returns jsonb
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid());
  v_semester uuid;
  v_course_count integer := 0;
  v_named_course_count integer := 0;
  v_course_drive_count integer := 0;
  v_resource_count integer := 0;
  v_verified_resource_count integer := 0;
  v_skill_count integer := 0;
  v_question_count integer := 0;
  v_drive_connected boolean := false;
  v_drive_tree_ready boolean := false;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  select id into v_semester from public.study_semesters where user_id=v_user and stable_key='ws26_27' and active limit 1;
  if v_semester is null then
    return jsonb_build_object('workspace_initialized',false,'course_count',0,'named_course_count',0,'drive_connected',false,'drive_tree_ready',false,'resource_count',0,'verified_resource_count',0,'skill_count',0,'question_count',0);
  end if;

  select count(*)::int,
    count(*) filter(where display_name not like 'Major Course %' and display_name not in ('Programming','Microeconomics'))::int,
    count(*) filter(where drive_folder_id is not null)::int
  into v_course_count,v_named_course_count,v_course_drive_count
  from public.study_courses where user_id=v_user and semester_id=v_semester and active;

  select count(*)::int,count(*) filter(where processing_status='verified')::int
  into v_resource_count,v_verified_resource_count
  from public.study_resources r join public.study_courses c on c.id=r.course_id and c.user_id=r.user_id
  where r.user_id=v_user and c.semester_id=v_semester and r.active;

  select count(*)::int into v_skill_count
  from public.study_skills s join public.study_courses c on c.id=s.course_id and c.user_id=s.user_id
  where s.user_id=v_user and c.semester_id=v_semester and s.active;

  select count(*)::int into v_question_count
  from public.study_questions q join public.study_courses c on c.id=q.course_id and c.user_id=q.user_id
  where q.user_id=v_user and c.semester_id=v_semester and q.active;

  select exists(select 1 from public.study_drive_connections where user_id=v_user and status='connected') into v_drive_connected;

  select (s.drive_root_folder_id is not null and s.drive_inbox_folder_id is not null and v_course_drive_count=v_course_count and v_course_count=6)
  into v_drive_tree_ready from public.study_semesters s where s.id=v_semester and s.user_id=v_user;

  return jsonb_build_object(
    'workspace_initialized',true,'semester_id',v_semester,'course_count',v_course_count,'named_course_count',v_named_course_count,
    'courses_ready',(v_course_count=6 and v_named_course_count=6),'drive_connected',v_drive_connected,
    'drive_tree_ready',coalesce(v_drive_tree_ready,false),'resource_count',v_resource_count,
    'verified_resource_count',v_verified_resource_count,'skill_count',v_skill_count,'question_count',v_question_count,
    'first_material_ready',(v_verified_resource_count>0 and v_skill_count>0 and v_question_count>0)
  );
end;
$function$;

revoke all on function public.study_readiness_snapshot() from public,anon;
grant execute on function public.study_readiness_snapshot() to authenticated;
