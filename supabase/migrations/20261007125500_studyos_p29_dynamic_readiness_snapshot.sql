-- P29: remove the final fixed WS26/27 / six-course assumptions from the legacy readiness RPC.
-- Current setup uses study_activation_snapshot, but this RPC remains supported for compatibility.

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

  select id into v_semester
  from public.study_semesters
  where user_id=v_user and active
  order by created_at desc
  limit 1;

  if v_semester is null then
    return jsonb_build_object(
      'workspace_initialized',false,
      'course_count',0,
      'named_course_count',0,
      'courses_ready',false,
      'drive_connected',false,
      'drive_tree_ready',false,
      'resource_count',0,
      'verified_resource_count',0,
      'skill_count',0,
      'question_count',0,
      'first_material_ready',false
    );
  end if;

  select
    count(*)::int,
    count(*) filter(where nullif(btrim(display_name),'') is not null)::int,
    count(*) filter(where drive_folder_id is not null)::int
  into v_course_count,v_named_course_count,v_course_drive_count
  from public.study_courses
  where user_id=v_user and semester_id=v_semester and active;

  select count(*)::int,count(*) filter(where processing_status='verified')::int
  into v_resource_count,v_verified_resource_count
  from public.study_resources r
  join public.study_courses c on c.id=r.course_id and c.user_id=r.user_id
  where r.user_id=v_user and c.semester_id=v_semester and r.active;

  select count(*)::int into v_skill_count
  from public.study_skills s
  join public.study_courses c on c.id=s.course_id and c.user_id=s.user_id
  where s.user_id=v_user and c.semester_id=v_semester and s.active;

  select count(*)::int into v_question_count
  from public.study_questions q
  join public.study_courses c on c.id=q.course_id and c.user_id=q.user_id
  where q.user_id=v_user and c.semester_id=v_semester and q.active;

  select exists(
    select 1 from public.study_drive_connections
    where user_id=v_user and status='connected'
  ) into v_drive_connected;

  select (
    s.drive_semester_folder_id is not null
    and s.drive_inbox_folder_id is not null
    and v_course_count>0
    and v_course_drive_count=v_course_count
  )
  into v_drive_tree_ready
  from public.study_semesters s
  where s.id=v_semester and s.user_id=v_user;

  return jsonb_build_object(
    'workspace_initialized',true,
    'semester_id',v_semester,
    'course_count',v_course_count,
    'named_course_count',v_named_course_count,
    'courses_ready',(v_course_count>0 and v_named_course_count=v_course_count),
    'drive_connected',v_drive_connected,
    'drive_tree_ready',coalesce(v_drive_tree_ready,false),
    'resource_count',v_resource_count,
    'verified_resource_count',v_verified_resource_count,
    'skill_count',v_skill_count,
    'question_count',v_question_count,
    'first_material_ready',(v_verified_resource_count>0 and v_skill_count>0 and v_question_count>0)
  );
end;
$function$;

revoke all on function public.study_readiness_snapshot() from public,anon;
grant execute on function public.study_readiness_snapshot() to authenticated;
