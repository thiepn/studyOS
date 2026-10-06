create table public.study_exam_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null,
  course_id uuid not null,
  attempt_no smallint not null check (attempt_no between 1 and 10),
  exam_at timestamptz not null,
  result_status text not null check (result_status in ('provisional','official')),
  outcome text not null check (outcome in ('passed','failed','absent','withdrawn')),
  grade_text text null check (grade_text is null or char_length(grade_text) between 1 and 40),
  score_percent numeric(5,2) null check (score_percent is null or (score_percent between 0 and 100)),
  published_at timestamptz null,
  source_note text null check (source_note is null or char_length(source_note) <= 2000),
  source_url text null check (source_url is null or char_length(source_url) <= 2048),
  readiness_index_snapshot numeric(5,2) null check (readiness_index_snapshot is null or readiness_index_snapshot between 0 and 100),
  readiness_band_snapshot text null,
  decision_priority_snapshot numeric(6,2) null,
  retake_decision text not null default 'not_applicable'
    check (retake_decision in ('not_applicable','pending','planned','declined')),
  next_exam_at timestamptz null,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_exam_results_course_owner_fk
    foreign key (course_id,user_id) references public.study_courses(id,user_id) on delete cascade,
  constraint study_exam_results_semester_owner_fk
    foreign key (semester_id,user_id) references public.study_semesters(id,user_id) on delete cascade,
  constraint study_exam_results_user_course_attempt_unique unique (user_id,course_id,attempt_no),
  constraint study_exam_results_retake_consistency check (
    (outcome='passed' and retake_decision='not_applicable' and next_exam_at is null)
    or
    (outcome in ('failed','absent','withdrawn') and (
      (retake_decision in ('pending','declined') and next_exam_at is null)
      or
      (retake_decision='planned' and next_exam_at is not null and next_exam_at > exam_at)
    ))
  )
);

create index study_exam_results_semester_idx
  on public.study_exam_results(user_id,semester_id,course_id,attempt_no desc);

create index study_exam_results_next_exam_idx
  on public.study_exam_results(user_id,next_exam_at)
  where retake_decision='planned';

alter table public.study_exam_results enable row level security;

create policy "study_exam_results_select_own"
on public.study_exam_results for select
to authenticated
using (auth.uid()=user_id);

create policy "study_exam_results_insert_own"
on public.study_exam_results for insert
to authenticated
with check (auth.uid()=user_id and coalesce(auth.jwt()->>'is_anonymous','false')<>'true');

create policy "study_exam_results_update_own"
on public.study_exam_results for update
to authenticated
using (auth.uid()=user_id and coalesce(auth.jwt()->>'is_anonymous','false')<>'true')
with check (auth.uid()=user_id and coalesce(auth.jwt()->>'is_anonymous','false')<>'true');

create policy "study_exam_results_delete_own"
on public.study_exam_results for delete
to authenticated
using (auth.uid()=user_id and coalesce(auth.jwt()->>'is_anonymous','false')<>'true');

grant select,insert,update,delete on public.study_exam_results to authenticated;
revoke all on public.study_exam_results from anon;
