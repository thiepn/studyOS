alter table public.study_semesters
  add column if not exists bootstrap_certified_at timestamptz;

create table if not exists public.study_course_historical_priors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null,
  course_id uuid not null,
  source_semester_id uuid not null,
  source_course_id uuid not null,
  relation text not null check (relation in ('direct_retake','prerequisite','related')),
  note text null check (note is null or char_length(note)<=1000),
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_course_historical_priors_course_owner_fk
    foreign key (course_id,user_id) references public.study_courses(id,user_id) on delete cascade,
  constraint study_course_historical_priors_source_course_owner_fk
    foreign key (source_course_id,user_id) references public.study_courses(id,user_id) on delete cascade,
  constraint study_course_historical_priors_semester_owner_fk
    foreign key (semester_id,user_id) references public.study_semesters(id,user_id) on delete cascade,
  constraint study_course_historical_priors_source_semester_owner_fk
    foreign key (source_semester_id,user_id) references public.study_semesters(id,user_id) on delete cascade,
  constraint study_course_historical_priors_cross_semester check (semester_id<>source_semester_id),
  constraint study_course_historical_priors_unique unique(user_id,course_id,source_course_id)
);

create index if not exists study_course_historical_priors_target_idx
  on public.study_course_historical_priors(user_id,semester_id,course_id);

alter table public.study_course_historical_priors enable row level security;
create policy "study_course_historical_priors_select_own" on public.study_course_historical_priors
  for select to authenticated using ((select auth.uid())=user_id);
create policy "study_course_historical_priors_insert_own" on public.study_course_historical_priors
  for insert to authenticated with check ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true');
create policy "study_course_historical_priors_update_own" on public.study_course_historical_priors
  for update to authenticated
  using ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true')
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true');
create policy "study_course_historical_priors_delete_own" on public.study_course_historical_priors
  for delete to authenticated using ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true');
grant select,insert,update,delete on public.study_course_historical_priors to authenticated;
revoke all on public.study_course_historical_priors from anon;

create or replace function public.study_historical_prior_snapshot(p_source_course_id uuid)
returns jsonb language sql stable set search_path to 'public','pg_temp'
as $function$
  select jsonb_build_object(
    'source_course_id',c.id,'source_semester_id',c.semester_id,'stable_key',c.stable_key,
    'display_name',c.display_name,'short_name',c.short_name,'course_kind',c.course_kind,'credits',c.credits,
    'official_attempts',(select count(*) from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official'),
    'latest_outcome',(select r.outcome from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_grade_text',(select r.grade_text from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_score_percent',(select r.score_percent from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_readiness_index',(select r.readiness_index_snapshot from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_readiness_band',(select r.readiness_band_snapshot from public.study_exam_results r where r.user_id=(select auth.uid()) and r.course_id=c.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'skill_count',(select count(*) from public.study_skills s where s.user_id=(select auth.uid()) and s.course_id=c.id and s.active),
    'unresolved_findings',(select count(*) from public.study_reconciliation_findings f where f.user_id=(select auth.uid()) and f.course_id=c.id and f.status in ('open','repair_scheduled'))
  )
  from public.study_courses c
  where c.id=p_source_course_id and c.user_id=(select auth.uid());
$function$;
revoke all on function public.study_historical_prior_snapshot(uuid) from public,anon;
grant execute on function public.study_historical_prior_snapshot(uuid) to authenticated;

create or replace function public.study_create_course(
  p_stable_key text,p_display_name text,p_short_name text default null,p_course_kind text default 'major',
  p_professor text default null,p_credits numeric default null,p_exam_at timestamptz default null,
  p_exam_duration_minutes smallint default null,p_exam_format text default null,p_sort_order smallint default null,
  p_expected_lectures_per_week smallint default null,p_expects_exercise boolean default true,
  p_expects_solution boolean default true,p_lecture_retrieval_target_hours smallint default 24,
  p_solution_reconcile_target_hours smallint default 48,p_checkpoint_weight numeric default 1
) returns jsonb language plpgsql set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid()); v_semester public.study_semesters%rowtype;
  v_course public.study_courses%rowtype; v_sort smallint;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  select * into v_semester from public.study_semesters where user_id=v_user and active for update;
  if not found then raise exception 'active semester not found'; end if;
  if p_stable_key is null or p_stable_key !~ '^[a-z0-9_]{2,80}$' then raise exception 'invalid stable key'; end if;
  if p_display_name is null or char_length(btrim(p_display_name))<1 or char_length(btrim(p_display_name))>160 then raise exception 'invalid display name'; end if;
  if p_course_kind not in ('major','minor','retake') then raise exception 'invalid course kind'; end if;
  if p_credits is not null and (p_credits<=0 or p_credits>60) then raise exception 'credits out of range'; end if;
  if p_exam_duration_minutes is not null and (p_exam_duration_minutes<15 or p_exam_duration_minutes>600) then raise exception 'exam duration out of range'; end if;
  if p_expected_lectures_per_week is not null and (p_expected_lectures_per_week<0 or p_expected_lectures_per_week>7) then raise exception 'expected lectures out of range'; end if;
  if p_lecture_retrieval_target_hours<1 or p_lecture_retrieval_target_hours>168 then raise exception 'lecture retrieval target out of range'; end if;
  if p_solution_reconcile_target_hours<1 or p_solution_reconcile_target_hours>336 then raise exception 'solution reconciliation target out of range'; end if;
  if p_checkpoint_weight<=0 or p_checkpoint_weight>10 then raise exception 'checkpoint weight out of range'; end if;
  if p_sort_order is null then
    select (coalesce(max(sort_order),0)+1)::smallint into v_sort from public.study_courses where user_id=v_user and semester_id=v_semester.id;
  else v_sort:=p_sort_order; end if;
  insert into public.study_courses(
    user_id,semester_id,stable_key,display_name,short_name,course_kind,professor,credits,
    exam_at,exam_duration_minutes,exam_format,sort_order,active
  ) values(
    v_user,v_semester.id,p_stable_key,btrim(p_display_name),nullif(btrim(p_short_name),''),
    p_course_kind::public.study_course_kind,nullif(btrim(p_professor),''),p_credits,
    p_exam_at,p_exam_duration_minutes,nullif(btrim(p_exam_format),''),v_sort,true
  ) returning * into v_course;
  insert into public.study_course_workflow_settings(
    course_id,user_id,expected_lectures_per_week,expects_exercise,expects_solution,
    lecture_retrieval_target_hours,solution_reconcile_target_hours,checkpoint_weight
  ) values(
    v_course.id,v_user,p_expected_lectures_per_week,p_expects_exercise,p_expects_solution,
    p_lecture_retrieval_target_hours,p_solution_reconcile_target_hours,p_checkpoint_weight
  ) on conflict(course_id) do update set
    expected_lectures_per_week=excluded.expected_lectures_per_week,expects_exercise=excluded.expects_exercise,
    expects_solution=excluded.expects_solution,lecture_retrieval_target_hours=excluded.lecture_retrieval_target_hours,
    solution_reconcile_target_hours=excluded.solution_reconcile_target_hours,checkpoint_weight=excluded.checkpoint_weight,updated_at=now();
  update public.study_semesters set bootstrap_certified_at=null,updated_at=now() where id=v_semester.id and user_id=v_user;
  return jsonb_build_object('course_id',v_course.id,'semester_id',v_semester.id,'stable_key',v_course.stable_key,'display_name',v_course.display_name,'course_kind',v_course.course_kind);
end;
$function$;
revoke all on function public.study_create_course(text,text,text,text,text,numeric,timestamptz,smallint,text,smallint,smallint,boolean,boolean,smallint,smallint,numeric) from public,anon;
grant execute on function public.study_create_course(text,text,text,text,text,numeric,timestamptz,smallint,text,smallint,smallint,boolean,boolean,smallint,smallint,numeric) to authenticated;

create or replace function public.study_attach_historical_prior(p_course_id uuid,p_source_course_id uuid,p_relation text,p_note text default null)
returns jsonb language plpgsql set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid()); v_target public.study_courses%rowtype; v_source public.study_courses%rowtype;
  v_source_semester public.study_semesters%rowtype; v_snapshot jsonb; v_prior_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if p_relation not in ('direct_retake','prerequisite','related') then raise exception 'invalid prior relation'; end if;
  if p_note is not null and char_length(p_note)>1000 then raise exception 'prior note too long'; end if;
  select c.* into v_target from public.study_courses c join public.study_semesters s on s.id=c.semester_id and s.user_id=c.user_id
    where c.id=p_course_id and c.user_id=v_user and c.active and s.active;
  if not found then raise exception 'target course not found in active semester'; end if;
  select * into v_source from public.study_courses where id=p_source_course_id and user_id=v_user;
  if not found then raise exception 'source course not found'; end if;
  select * into v_source_semester from public.study_semesters where id=v_source.semester_id and user_id=v_user;
  if not found or v_source_semester.active or v_source_semester.archived_at is null then raise exception 'source course must belong to an archived semester'; end if;
  v_snapshot:=public.study_historical_prior_snapshot(v_source.id);
  if v_snapshot is null then raise exception 'could not build prior snapshot'; end if;
  insert into public.study_course_historical_priors(user_id,semester_id,course_id,source_semester_id,source_course_id,relation,note,source_snapshot)
  values(v_user,v_target.semester_id,v_target.id,v_source.semester_id,v_source.id,p_relation,nullif(btrim(p_note),''),v_snapshot)
  on conflict(user_id,course_id,source_course_id) do update set relation=excluded.relation,note=excluded.note,source_snapshot=excluded.source_snapshot,updated_at=now()
  returning id into v_prior_id;
  update public.study_semesters set bootstrap_certified_at=null,updated_at=now() where id=v_target.semester_id and user_id=v_user;
  return jsonb_build_object('prior_id',v_prior_id,'course_id',v_target.id,'source_course_id',v_source.id);
end;
$function$;
revoke all on function public.study_attach_historical_prior(uuid,uuid,text,text) from public,anon;
grant execute on function public.study_attach_historical_prior(uuid,uuid,text,text) to authenticated;

create or replace function public.study_remove_historical_prior(p_prior_id uuid)
returns jsonb language plpgsql set search_path to 'public','pg_temp'
as $function$
declare v_user uuid := (select auth.uid()); v_semester uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  delete from public.study_course_historical_priors where id=p_prior_id and user_id=v_user returning semester_id into v_semester;
  if v_semester is null then raise exception 'prior not found'; end if;
  update public.study_semesters set bootstrap_certified_at=null,updated_at=now() where id=v_semester and user_id=v_user;
  return jsonb_build_object('removed',true,'prior_id',p_prior_id);
end;
$function$;
revoke all on function public.study_remove_historical_prior(uuid) from public,anon;
grant execute on function public.study_remove_historical_prior(uuid) to authenticated;

create or replace function public.study_auto_attach_direct_retake_prior()
returns trigger language plpgsql set search_path to 'public','pg_temp'
as $function$
declare v_previous uuid; v_source public.study_courses%rowtype;
begin
  if new.course_kind<>'retake'::public.study_course_kind then return new; end if;
  select previous_semester_id into v_previous from public.study_semesters where id=new.semester_id and user_id=new.user_id;
  if v_previous is null then return new; end if;
  select * into v_source from public.study_courses where user_id=new.user_id and semester_id=v_previous and stable_key=new.stable_key limit 1;
  if not found then return new; end if;
  insert into public.study_course_historical_priors(user_id,semester_id,course_id,source_semester_id,source_course_id,relation,source_snapshot)
  values(new.user_id,new.semester_id,new.id,v_source.semester_id,v_source.id,'direct_retake',public.study_historical_prior_snapshot(v_source.id))
  on conflict(user_id,course_id,source_course_id) do nothing;
  return new;
end;
$function$;
drop trigger if exists study_courses_auto_attach_direct_retake_prior on public.study_courses;
create trigger study_courses_auto_attach_direct_retake_prior after insert on public.study_courses
for each row execute function public.study_auto_attach_direct_retake_prior();

insert into public.study_course_historical_priors(user_id,semester_id,course_id,source_semester_id,source_course_id,relation,source_snapshot)
select c.user_id,c.semester_id,c.id,src.semester_id,src.id,'direct_retake',
  jsonb_build_object(
    'source_course_id',src.id,
    'source_semester_id',src.semester_id,
    'stable_key',src.stable_key,
    'display_name',src.display_name,
    'short_name',src.short_name,
    'course_kind',src.course_kind,
    'credits',src.credits,
    'official_attempts',(select count(*) from public.study_exam_results r where r.user_id=c.user_id and r.course_id=src.id and r.result_status='official'),
    'latest_outcome',(select r.outcome from public.study_exam_results r where r.user_id=c.user_id and r.course_id=src.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_grade_text',(select r.grade_text from public.study_exam_results r where r.user_id=c.user_id and r.course_id=src.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_score_percent',(select r.score_percent from public.study_exam_results r where r.user_id=c.user_id and r.course_id=src.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_readiness_index',(select r.readiness_index_snapshot from public.study_exam_results r where r.user_id=c.user_id and r.course_id=src.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'latest_readiness_band',(select r.readiness_band_snapshot from public.study_exam_results r where r.user_id=c.user_id and r.course_id=src.id and r.result_status='official' order by r.attempt_no desc limit 1),
    'skill_count',(select count(*) from public.study_skills sk where sk.user_id=c.user_id and sk.course_id=src.id and sk.active),
    'unresolved_findings',(select count(*) from public.study_reconciliation_findings rf where rf.user_id=c.user_id and rf.course_id=src.id and rf.status in ('open','repair_scheduled'))
  )
from public.study_courses c
join public.study_semesters sem on sem.id=c.semester_id and sem.user_id=c.user_id
join public.study_courses src on src.semester_id=sem.previous_semester_id and src.user_id=c.user_id and src.stable_key=c.stable_key
where sem.active and c.active and c.course_kind='retake'
on conflict(user_id,course_id,source_course_id) do nothing;

create or replace function public.study_certify_semester_bootstrap()
returns jsonb language plpgsql set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := (select auth.uid()); v_semester public.study_semesters%rowtype; v_course_count integer;
  v_missing_workflow integer; v_missing_curriculum integer; v_missing_baseline integer;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  select * into v_semester from public.study_semesters where user_id=v_user and active for update;
  if not found then raise exception 'active semester not found'; end if;
  select count(*) into v_course_count from public.study_courses where user_id=v_user and semester_id=v_semester.id and active;
  if v_course_count=0 then raise exception 'add at least one active course before certification'; end if;
  select count(*) into v_missing_workflow from public.study_courses c left join public.study_course_workflow_settings w on w.course_id=c.id and w.user_id=c.user_id
    where c.user_id=v_user and c.semester_id=v_semester.id and c.active and w.course_id is null;
  select count(*) into v_missing_curriculum from public.study_courses c where c.user_id=v_user and c.semester_id=v_semester.id and c.active and (
    not exists(select 1 from public.study_resources r where r.user_id=v_user and r.course_id=c.id and r.active and r.processing_status='verified')
    or not exists(select 1 from public.study_skills s where s.user_id=v_user and s.course_id=c.id and s.active)
    or not exists(select 1 from public.study_questions q where q.user_id=v_user and q.course_id=c.id and q.active)
  );
  select count(*) into v_missing_baseline from public.study_courses c where c.user_id=v_user and c.semester_id=v_semester.id and c.active and c.course_kind='retake'
    and not exists(select 1 from public.study_baseline_diagnostics b where b.user_id=v_user and b.course_id=c.id and b.status='completed');
  if v_missing_workflow>0 then raise exception '% course(s) lack workflow settings',v_missing_workflow; end if;
  if v_missing_curriculum>0 then raise exception '% course(s) lack verified curriculum resources/skills/questions',v_missing_curriculum; end if;
  if v_missing_baseline>0 then raise exception '% retake course(s) lack completed baseline diagnostics',v_missing_baseline; end if;
  update public.study_semesters set bootstrap_certified_at=now(),updated_at=now() where id=v_semester.id and user_id=v_user;
  return jsonb_build_object('semester_id',v_semester.id,'certified',true,'course_count',v_course_count,'certified_at',now());
end;
$function$;
revoke all on function public.study_certify_semester_bootstrap() from public,anon;
grant execute on function public.study_certify_semester_bootstrap() to authenticated;
