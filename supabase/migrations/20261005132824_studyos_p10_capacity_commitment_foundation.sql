do $$ begin
  create type public.study_capacity_mode as enum ('normal','light','recovery','intensive','custom');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.study_commitment_kind as enum ('assignment','deadline','exam','administrative','other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.study_commitment_status as enum ('open','completed','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.study_planning_settings(
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references public.study_semesters(id) on delete cascade,
  default_mode public.study_capacity_mode not null default 'normal',
  normal_budget_minutes smallint not null default 120,
  light_budget_minutes smallint not null default 75,
  recovery_budget_minutes smallint not null default 45,
  intensive_budget_minutes smallint not null default 180,
  light_review_budget_minutes smallint not null default 30,
  recovery_review_budget_minutes smallint not null default 20,
  max_focus_items smallint not null default 4,
  recovery_max_focus_items smallint not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,semester_id),
  constraint study_planning_settings_default_mode_check check(default_mode <> 'custom'),
  constraint study_planning_settings_budget_check check(
    normal_budget_minutes between 15 and 720 and light_budget_minutes between 15 and 720
    and recovery_budget_minutes between 15 and 720 and intensive_budget_minutes between 15 and 720
    and light_review_budget_minutes between 5 and 120 and recovery_review_budget_minutes between 5 and 120
    and max_focus_items between 1 and 12 and recovery_max_focus_items between 1 and 6
  )
);

create table if not exists public.study_daily_capacity(
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references public.study_semesters(id) on delete cascade,
  plan_date date not null,
  mode public.study_capacity_mode not null,
  custom_budget_minutes smallint,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,semester_id,plan_date),
  constraint study_daily_capacity_custom_check check(
    (mode='custom' and custom_budget_minutes between 15 and 720)
    or (mode<>'custom' and custom_budget_minutes is null)
  )
);

create table if not exists public.study_commitments(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references public.study_semesters(id) on delete cascade,
  course_id uuid references public.study_courses(id) on delete cascade,
  resource_id uuid references public.study_resources(id) on delete set null,
  kind public.study_commitment_kind not null default 'deadline',
  title text not null,
  due_at timestamptz not null,
  estimated_minutes smallint not null default 45,
  priority smallint not null default 3,
  status public.study_commitment_status not null default 'open',
  source_url text,
  note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_commitments_title_check check(length(btrim(title)) between 1 and 240),
  constraint study_commitments_estimate_check check(estimated_minutes between 5 and 720),
  constraint study_commitments_priority_check check(priority between 1 and 5),
  constraint study_commitments_source_url_check check(source_url is null or source_url ~ '^https://')
);

create index if not exists study_planning_settings_semester_idx on public.study_planning_settings(semester_id,user_id);
create index if not exists study_daily_capacity_semester_date_idx on public.study_daily_capacity(semester_id,plan_date);
create index if not exists study_commitments_user_due_idx on public.study_commitments(user_id,semester_id,status,due_at);
create index if not exists study_commitments_semester_idx on public.study_commitments(semester_id,user_id,status,due_at);
create index if not exists study_commitments_course_idx on public.study_commitments(course_id) where course_id is not null;
create index if not exists study_commitments_resource_idx on public.study_commitments(resource_id) where resource_id is not null;

alter table public.study_planning_settings enable row level security;
alter table public.study_daily_capacity enable row level security;
alter table public.study_commitments enable row level security;

drop policy if exists study_planning_settings_owner_all on public.study_planning_settings;
create policy study_planning_settings_owner_all on public.study_planning_settings
for all to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id)
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);

drop policy if exists study_daily_capacity_owner_all on public.study_daily_capacity;
create policy study_daily_capacity_owner_all on public.study_daily_capacity
for all to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id)
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);

drop policy if exists study_commitments_owner_all on public.study_commitments;
create policy study_commitments_owner_all on public.study_commitments
for all to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id)
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);

revoke all on public.study_planning_settings,public.study_daily_capacity,public.study_commitments from anon;
grant select,insert,update,delete on public.study_planning_settings,public.study_daily_capacity,public.study_commitments to authenticated;
