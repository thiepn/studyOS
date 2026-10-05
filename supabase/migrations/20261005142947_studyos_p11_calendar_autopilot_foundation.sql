do $$ begin
  create type public.study_calendar_event_role as enum ('busy','lecture','exercise','exam','deadline','study_block','other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.study_scheduled_block_status as enum ('proposed','committed','completed','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.study_calendar_connections(
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_account_sub text,
  google_account_email text,
  scopes text[] not null default '{}',
  status text not null default 'disconnected',
  write_calendar_id text,
  timezone text,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_sync_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_calendar_connections_status_check check(status in ('connected','disconnected','error'))
);

create table if not exists public.study_calendar_credentials(
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_refresh_token text not null,
  encryption_version smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_calendar_sources(
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id text not null,
  summary text not null,
  access_role text,
  is_primary boolean not null default false,
  selected boolean not null default false,
  writable boolean not null default false,
  timezone text,
  background_color text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,calendar_id)
);

create table if not exists public.study_calendar_events(
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id text not null,
  event_id text not null,
  course_id uuid references public.study_courses(id) on delete set null,
  summary text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  status text,
  transparency text,
  event_type text,
  event_role public.study_calendar_event_role not null default 'busy',
  location text,
  event_url text,
  recurring_event_id text,
  study_owned boolean not null default false,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,calendar_id,event_id),
  constraint study_calendar_events_time_check check(end_at > start_at)
);

create table if not exists public.study_calendar_planning_settings(
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references public.study_semesters(id) on delete cascade,
  day_start time not null default '08:00',
  day_end time not null default '22:00',
  minimum_block_minutes smallint not null default 20,
  calendar_buffer_minutes smallint not null default 10,
  max_block_minutes smallint not null default 90,
  include_weekends boolean not null default true,
  study_reminder_minutes smallint not null default 10,
  sync_past_days smallint not null default 2,
  sync_future_days smallint not null default 21,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,semester_id),
  constraint study_calendar_planning_hours_check check(day_end > day_start),
  constraint study_calendar_planning_numbers_check check(
    minimum_block_minutes between 10 and 180
    and calendar_buffer_minutes between 0 and 60
    and max_block_minutes between minimum_block_minutes and 240
    and study_reminder_minutes between 0 and 1440
    and sync_past_days between 0 and 30
    and sync_future_days between 7 and 120
  )
);

create table if not exists public.study_scheduled_blocks(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references public.study_semesters(id) on delete cascade,
  course_id uuid references public.study_courses(id) on delete set null,
  plan_date date not null,
  candidate_id text not null,
  title text not null,
  candidate_kind text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  scheduled_minutes smallint not null,
  status public.study_scheduled_block_status not null default 'committed',
  calendar_id text not null,
  event_id text not null,
  event_url text,
  reminder_minutes smallint not null default 10,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_scheduled_blocks_time_check check(end_at > start_at),
  constraint study_scheduled_blocks_minutes_check check(scheduled_minutes between 1 and 720),
  constraint study_scheduled_blocks_reminder_check check(reminder_minutes between 0 and 1440),
  unique(user_id,calendar_id,event_id)
);

create index if not exists study_calendar_sources_selected_idx on public.study_calendar_sources(user_id,selected);
create index if not exists study_calendar_events_time_idx on public.study_calendar_events(user_id,start_at,end_at);
create index if not exists study_calendar_events_course_idx on public.study_calendar_events(course_id) where course_id is not null;
create index if not exists study_calendar_events_calendar_time_idx on public.study_calendar_events(user_id,calendar_id,start_at);
create index if not exists study_calendar_planning_semester_idx on public.study_calendar_planning_settings(semester_id,user_id);
create index if not exists study_scheduled_blocks_date_idx on public.study_scheduled_blocks(user_id,plan_date,status);
create index if not exists study_scheduled_blocks_course_idx on public.study_scheduled_blocks(course_id) where course_id is not null;
create index if not exists study_scheduled_blocks_semester_idx on public.study_scheduled_blocks(semester_id,user_id,plan_date);

alter table public.study_calendar_connections enable row level security;
alter table public.study_calendar_credentials enable row level security;
alter table public.study_calendar_sources enable row level security;
alter table public.study_calendar_events enable row level security;
alter table public.study_calendar_planning_settings enable row level security;
alter table public.study_scheduled_blocks enable row level security;

drop policy if exists study_calendar_connections_owner_select on public.study_calendar_connections;
create policy study_calendar_connections_owner_select on public.study_calendar_connections
for select to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);

drop policy if exists study_calendar_credentials_deny_clients on public.study_calendar_credentials;
create policy study_calendar_credentials_deny_clients on public.study_calendar_credentials
for select to authenticated using (false);

drop policy if exists study_calendar_sources_owner_all on public.study_calendar_sources;
create policy study_calendar_sources_owner_all on public.study_calendar_sources
for all to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id)
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);

drop policy if exists study_calendar_events_owner_select on public.study_calendar_events;
create policy study_calendar_events_owner_select on public.study_calendar_events
for select to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);

drop policy if exists study_calendar_planning_settings_owner_all on public.study_calendar_planning_settings;
create policy study_calendar_planning_settings_owner_all on public.study_calendar_planning_settings
for all to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id)
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);

drop policy if exists study_scheduled_blocks_owner_select on public.study_scheduled_blocks;
create policy study_scheduled_blocks_owner_select on public.study_scheduled_blocks
for select to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);

revoke all on public.study_calendar_connections,public.study_calendar_credentials,public.study_calendar_sources,public.study_calendar_events,public.study_calendar_planning_settings,public.study_scheduled_blocks from anon;
revoke all on public.study_calendar_credentials from authenticated;
grant select on public.study_calendar_connections,public.study_calendar_events,public.study_scheduled_blocks to authenticated;
grant select,insert,update,delete on public.study_calendar_sources,public.study_calendar_planning_settings to authenticated;
