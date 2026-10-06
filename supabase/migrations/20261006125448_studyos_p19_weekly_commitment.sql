create table public.study_week_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references public.study_semesters(id) on delete cascade,
  period_starts_on date not null,
  period_ends_on date not null,
  objective text not null check (objective in ('protect_passes','balanced','target_performance','exam_period')),
  capacity_source text not null check (capacity_source in ('planning_default','calendar_capped','custom')),
  weekly_capacity_minutes integer not null check (weekly_capacity_minutes >= 0),
  mandatory_reserve_minutes integer not null default 0 check (mandatory_reserve_minutes >= 0),
  retention_reserve_minutes integer not null default 0 check (retention_reserve_minutes >= 0),
  course_budget_minutes integer not null default 0 check (course_budget_minutes >= 0),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  revision integer not null default 1 check (revision >= 1),
  scenario_snapshot jsonb not null default '{}'::jsonb,
  committed_at timestamptz not null default now(),
  last_rebalanced_at timestamptz,
  last_rebalance_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, semester_id, period_ends_on),
  check (period_ends_on >= period_starts_on),
  check (mandatory_reserve_minutes + retention_reserve_minutes + course_budget_minutes <= weekly_capacity_minutes)
);

comment on table public.study_week_plans is
  'P19 durable weekly StudyOS commitment. Capacity is fixed at commit/rebalance time; live progress is derived from existing study evidence.';

create table public.study_week_allocations (
  plan_id uuid not null references public.study_week_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.study_courses(id) on delete cascade,
  original_minutes integer not null check (original_minutes >= 0),
  target_minutes integer not null check (target_minutes >= 0),
  protection_floor_minutes integer not null default 0 check (protection_floor_minutes >= 0),
  snapshot_readiness_index integer check (snapshot_readiness_index between 0 and 100),
  snapshot_decision_priority integer check (snapshot_decision_priority between 0 and 100),
  action_title text not null,
  action_href text not null,
  action_authority text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_id, course_id)
);

comment on table public.study_week_allocations is
  'P19 per-course weekly envelopes. original_minutes preserves the committed baseline; target_minutes may change only through explicit rolling reallocation.';

create index study_week_plans_owner_status_idx
  on public.study_week_plans(user_id, semester_id, status, period_ends_on desc);

create index study_week_allocations_owner_course_idx
  on public.study_week_allocations(user_id, course_id);

alter table public.study_week_plans enable row level security;
alter table public.study_week_allocations enable row level security;

create policy study_week_plans_owner_all
on public.study_week_plans
for all
to authenticated
using (
  (select auth.uid()) is not null
  and coalesce((select auth.jwt() ->> 'is_anonymous'),'false') <> 'true'
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and coalesce((select auth.jwt() ->> 'is_anonymous'),'false') <> 'true'
  and (select auth.uid()) = user_id
);

create policy study_week_allocations_owner_all
on public.study_week_allocations
for all
to authenticated
using (
  (select auth.uid()) is not null
  and coalesce((select auth.jwt() ->> 'is_anonymous'),'false') <> 'true'
  and (select auth.uid()) = user_id
  and exists (
    select 1 from public.study_week_plans p
    where p.id = plan_id and p.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.study_courses c
    where c.id = course_id and c.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) is not null
  and coalesce((select auth.jwt() ->> 'is_anonymous'),'false') <> 'true'
  and (select auth.uid()) = user_id
  and exists (
    select 1 from public.study_week_plans p
    where p.id = plan_id and p.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.study_courses c
    where c.id = course_id and c.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.study_week_plans to authenticated;
grant select, insert, update, delete on public.study_week_allocations to authenticated;

create trigger study_week_plans_touch_updated_at
before update on public.study_week_plans
for each row execute function public.study_touch_updated_at();

create trigger study_week_allocations_touch_updated_at
before update on public.study_week_allocations
for each row execute function public.study_touch_updated_at();
