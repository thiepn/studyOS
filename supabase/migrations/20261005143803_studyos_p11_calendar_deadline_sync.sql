alter table public.study_commitments
  add column if not exists calendar_id text,
  add column if not exists calendar_event_id text,
  add column if not exists calendar_synced boolean not null default false,
  add column if not exists source_updated_at timestamptz;

create unique index if not exists study_commitments_calendar_event_unique
  on public.study_commitments(user_id,calendar_id,calendar_event_id);

create index if not exists study_commitments_calendar_synced_idx
  on public.study_commitments(user_id,calendar_synced,status,due_at)
  where calendar_synced;
