do $$ begin
  create type public.study_baseline_status as enum ('not_started','in_progress','completed','skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.study_baseline_classification as enum ('retained','rusty','weak','never_mastered');
exception when duplicate_object then null; end $$;

create table if not exists public.study_baseline_diagnostics(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references public.study_semesters(id) on delete cascade,
  course_id uuid not null references public.study_courses(id) on delete cascade,
  status public.study_baseline_status not null default 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,course_id)
);

create table if not exists public.study_baseline_results(
  diagnostic_id uuid not null references public.study_baseline_diagnostics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.study_courses(id) on delete cascade,
  skill_id uuid not null references public.study_skills(id) on delete cascade,
  classification public.study_baseline_classification not null,
  confidence smallint,
  note text,
  classified_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(diagnostic_id,skill_id),
  constraint study_baseline_results_confidence_check check(confidence is null or confidence between 1 and 5)
);

create index if not exists study_baseline_diagnostics_semester_idx on public.study_baseline_diagnostics(semester_id,user_id,status);
create index if not exists study_baseline_diagnostics_course_idx on public.study_baseline_diagnostics(course_id);
create index if not exists study_baseline_results_user_course_idx on public.study_baseline_results(user_id,course_id,classification);
create index if not exists study_baseline_results_skill_idx on public.study_baseline_results(skill_id);

alter table public.study_baseline_diagnostics enable row level security;
alter table public.study_baseline_results enable row level security;

drop policy if exists study_baseline_diagnostics_owner_all on public.study_baseline_diagnostics;
create policy study_baseline_diagnostics_owner_all on public.study_baseline_diagnostics
for all to authenticated
using (
  (select auth.uid()) is not null
  and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true'
  and (select auth.uid())=user_id
)
with check (
  (select auth.uid()) is not null
  and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true'
  and (select auth.uid())=user_id
);

drop policy if exists study_baseline_results_owner_all on public.study_baseline_results;
create policy study_baseline_results_owner_all on public.study_baseline_results
for all to authenticated
using (
  (select auth.uid()) is not null
  and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true'
  and (select auth.uid())=user_id
)
with check (
  (select auth.uid()) is not null
  and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true'
  and (select auth.uid())=user_id
);

revoke all on public.study_baseline_diagnostics,public.study_baseline_results from anon;
grant select,insert,update,delete on public.study_baseline_diagnostics,public.study_baseline_results to authenticated;

create or replace function public.study_start_baseline(p_course_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_user uuid := (select auth.uid());
  v_semester uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce(((select auth.jwt())->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  select semester_id into v_semester
  from public.study_courses
  where id=p_course_id and user_id=v_user and active and course_kind='retake';
  if v_semester is null then raise exception 'retake course not found'; end if;

  insert into public.study_baseline_diagnostics(user_id,semester_id,course_id,status,started_at)
  values(v_user,v_semester,p_course_id,'in_progress',now())
  on conflict(user_id,course_id) do update
    set status=case when public.study_baseline_diagnostics.status='completed' then 'completed' else 'in_progress' end,
        started_at=coalesce(public.study_baseline_diagnostics.started_at,now()),
        updated_at=now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.study_classify_baseline_skill(
  p_course_id uuid,
  p_skill_id uuid,
  p_classification public.study_baseline_classification,
  p_confidence smallint default null,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_user uuid := (select auth.uid());
  v_diag uuid;
  v_semester uuid;
  v_next timestamptz;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce(((select auth.jwt())->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if p_confidence is not null and p_confidence not between 1 and 5 then raise exception 'confidence must be 1–5'; end if;

  select semester_id into v_semester
  from public.study_courses
  where id=p_course_id and user_id=v_user and active and course_kind='retake';
  if v_semester is null then raise exception 'retake course not found'; end if;

  if not exists(select 1 from public.study_skills where id=p_skill_id and user_id=v_user and course_id=p_course_id and active) then
    raise exception 'skill not found';
  end if;

  v_diag:=public.study_start_baseline(p_course_id);

  insert into public.study_baseline_results(diagnostic_id,user_id,course_id,skill_id,classification,confidence,note)
  values(v_diag,v_user,p_course_id,p_skill_id,p_classification,p_confidence,nullif(left(coalesce(p_note,''),2000),''))
  on conflict(diagnostic_id,skill_id) do update
    set classification=excluded.classification,confidence=excluded.confidence,note=excluded.note,
        classified_at=now(),updated_at=now();

  v_next:=case p_classification
    when 'retained' then now()+interval '21 days'
    when 'rusty' then now()+interval '3 days'
    else now()
  end;

  update public.study_review_state
  set next_review_at=v_next,due_reason='baseline_'||p_classification::text,updated_at=now()
  where skill_id=p_skill_id and user_id=v_user and course_id=p_course_id;

  return jsonb_build_object('diagnostic_id',v_diag,'skill_id',p_skill_id,'classification',p_classification,'next_review_at',v_next);
end;
$$;

create or replace function public.study_complete_baseline(p_course_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_user uuid := (select auth.uid());
  v_diag uuid;
  v_skills integer;
  v_classified integer;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce(((select auth.jwt())->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  select id into v_diag from public.study_baseline_diagnostics
  where user_id=v_user and course_id=p_course_id;
  if v_diag is null then raise exception 'baseline diagnostic not started'; end if;

  select count(*) into v_skills from public.study_skills where user_id=v_user and course_id=p_course_id and active;
  select count(*) into v_classified from public.study_baseline_results where diagnostic_id=v_diag;

  if v_skills=0 then raise exception 'no active skills available for baseline'; end if;
  if v_classified<v_skills then raise exception 'classify all active skills before completing baseline'; end if;

  update public.study_baseline_diagnostics
  set status='completed',completed_at=now(),updated_at=now()
  where id=v_diag and user_id=v_user;

  return jsonb_build_object('diagnostic_id',v_diag,'skill_count',v_skills,'classified_count',v_classified,'status','completed');
end;
$$;

revoke all on function public.study_start_baseline(uuid) from public,anon;
grant execute on function public.study_start_baseline(uuid) to authenticated;
revoke all on function public.study_classify_baseline_skill(uuid,uuid,public.study_baseline_classification,smallint,text) from public,anon;
grant execute on function public.study_classify_baseline_skill(uuid,uuid,public.study_baseline_classification,smallint,text) to authenticated;
revoke all on function public.study_complete_baseline(uuid) from public,anon;
grant execute on function public.study_complete_baseline(uuid) to authenticated;

create or replace view public.study_baseline_summary
with (security_invoker=true)
as
select
  c.user_id,c.semester_id,c.id as course_id,c.stable_key,c.display_name,c.short_name,
  coalesce(d.status,'not_started'::public.study_baseline_status) as status,
  d.started_at,d.completed_at,
  count(distinct s.id)::integer as skill_count,
  count(distinct r.skill_id)::integer as classified_count,
  count(distinct r.skill_id) filter(where r.classification='retained')::integer as retained_count,
  count(distinct r.skill_id) filter(where r.classification='rusty')::integer as rusty_count,
  count(distinct r.skill_id) filter(where r.classification='weak')::integer as weak_count,
  count(distinct r.skill_id) filter(where r.classification='never_mastered')::integer as never_mastered_count
from public.study_courses c
left join public.study_baseline_diagnostics d on d.user_id=c.user_id and d.course_id=c.id
left join public.study_skills s on s.user_id=c.user_id and s.course_id=c.id and s.active
left join public.study_baseline_results r on r.user_id=c.user_id and r.course_id=c.id and r.skill_id=s.id
where c.active and c.course_kind='retake'
group by c.user_id,c.semester_id,c.id,c.stable_key,c.display_name,c.short_name,d.status,d.started_at,d.completed_at;

revoke all on public.study_baseline_summary from anon;
grant select on public.study_baseline_summary to authenticated;
