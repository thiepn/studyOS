do $$ begin
  create type public.study_exam_answer_status as enum ('missing','unverified','verified','official');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.study_exam_simulation_status as enum ('in_progress','grading','completed','abandoned');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.study_exam_grading_status as enum ('pending','provisional','verified','official');
exception when duplicate_object then null; end $$;

alter table public.study_exams
  add column if not exists solution_resource_id uuid,
  add column if not exists syllabus_relevance numeric not null default 1,
  add column if not exists notes text;
alter table public.study_exam_questions
  add column if not exists study_question_id uuid,
  add column if not exists prompt_text text,
  add column if not exists answer_key_or_rubric text,
  add column if not exists answer_status public.study_exam_answer_status not null default 'missing',
  add column if not exists solution_resource_id uuid,
  add column if not exists source_page_end integer,
  add column if not exists source_section text,
  add column if not exists solution_page integer,
  add column if not exists solution_section text,
  add column if not exists source_confidence numeric,
  add column if not exists sort_order smallint not null default 0,
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists(select 1 from pg_constraint where conname='study_exams_syllabus_relevance_check') then
    alter table public.study_exams add constraint study_exams_syllabus_relevance_check check(syllabus_relevance between 0 and 1);
  end if;
  if not exists(select 1 from pg_constraint where conname='study_exam_questions_source_confidence_check') then
    alter table public.study_exam_questions add constraint study_exam_questions_source_confidence_check check(source_confidence is null or source_confidence between 0 and 1);
  end if;
  if not exists(select 1 from pg_constraint where conname='study_exam_questions_sort_order_check') then
    alter table public.study_exam_questions add constraint study_exam_questions_sort_order_check check(sort_order >= 0);
  end if;
  if not exists(select 1 from pg_constraint where conname='study_exam_questions_study_question_fk') then
    alter table public.study_exam_questions add constraint study_exam_questions_study_question_fk foreign key(study_question_id) references public.study_questions(id) on delete set null;
  end if;
  if not exists(select 1 from pg_constraint where conname='study_exams_solution_resource_fk') then
    alter table public.study_exams add constraint study_exams_solution_resource_fk foreign key(solution_resource_id) references public.study_resources(id) on delete set null;
  end if;
  if not exists(select 1 from pg_constraint where conname='study_exam_questions_solution_resource_fk') then
    alter table public.study_exam_questions add constraint study_exam_questions_solution_resource_fk foreign key(solution_resource_id) references public.study_resources(id) on delete set null;
  end if;
end $$;

create unique index if not exists study_exam_questions_id_user_unique on public.study_exam_questions(id,user_id);
create index if not exists study_exam_questions_study_question_idx on public.study_exam_questions(user_id,study_question_id) where study_question_id is not null;
create index if not exists study_exams_active_course_idx on public.study_exams(user_id,course_id,active,exam_at);

create table if not exists public.study_exam_question_skills(
  exam_question_id uuid not null references public.study_exam_questions(id) on delete cascade,
  skill_id uuid not null references public.study_skills(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'secondary',
  weight numeric not null default 1,
  created_at timestamptz not null default now(),
  primary key(exam_question_id,skill_id),
  constraint study_exam_question_skills_role_check check(role in ('primary','secondary')),
  constraint study_exam_question_skills_weight_check check(weight > 0 and weight <= 1)
);
create table if not exists public.study_exam_simulations(
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.study_courses(id) on delete cascade,
  exam_id uuid not null references public.study_exams(id) on delete cascade,
  status public.study_exam_simulation_status not null default 'in_progress',
  duration_minutes smallint not null,
  total_points numeric not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  awarded_points numeric,
  verified_awarded_points numeric,
  verified_max_points numeric,
  score_percent numeric,
  verified_score_percent numeric,
  verified_coverage_percent numeric,
  time_used_seconds integer,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_exam_simulations_duration_check check(duration_minutes between 10 and 600),
  constraint study_exam_simulations_points_check check(total_points > 0),
  constraint study_exam_simulations_scores_check check((score_percent is null or score_percent between 0 and 100) and (verified_score_percent is null or verified_score_percent between 0 and 100) and (verified_coverage_percent is null or verified_coverage_percent between 0 and 100)),
  constraint study_exam_simulations_time_check check(time_used_seconds is null or time_used_seconds between 0 and 86400)
);
create table if not exists public.study_exam_simulation_items(
  simulation_id uuid not null references public.study_exam_simulations(id) on delete cascade,
  exam_question_id uuid not null references public.study_exam_questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.study_courses(id) on delete cascade,
  study_question_id uuid references public.study_questions(id) on delete set null,
  question_no text not null,
  sort_order smallint not null default 0,
  max_points numeric not null,
  response_text text,
  duration_seconds integer not null default 0,
  awarded_points numeric,
  error_types public.study_error_type[] not null default '{}',
  self_confidence smallint,
  grading_status public.study_exam_grading_status not null default 'pending',
  attempt_id uuid references public.study_attempts(id) on delete set null,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(simulation_id,exam_question_id),
  constraint study_exam_simulation_items_points_check check(max_points > 0 and (awarded_points is null or (awarded_points >= 0 and awarded_points <= max_points))),
  constraint study_exam_simulation_items_duration_check check(duration_seconds between 0 and 43200),
  constraint study_exam_simulation_items_confidence_check check(self_confidence is null or self_confidence between 1 and 5)
);

alter table public.study_exam_question_skills enable row level security;
alter table public.study_exam_simulations enable row level security;
alter table public.study_exam_simulation_items enable row level security;

drop policy if exists study_exams_owner_all on public.study_exams;
create policy study_exams_owner_all on public.study_exams for all to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id)
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);
drop policy if exists study_exam_questions_owner_all on public.study_exam_questions;
create policy study_exam_questions_owner_all on public.study_exam_questions for all to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id)
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);
drop policy if exists study_exam_question_skills_owner_all on public.study_exam_question_skills;
create policy study_exam_question_skills_owner_all on public.study_exam_question_skills for all to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id)
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);
drop policy if exists study_exam_simulations_owner_all on public.study_exam_simulations;
create policy study_exam_simulations_owner_all on public.study_exam_simulations for all to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id)
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);
drop policy if exists study_exam_simulation_items_owner_all on public.study_exam_simulation_items;
create policy study_exam_simulation_items_owner_all on public.study_exam_simulation_items for all to authenticated
using ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id)
with check ((select auth.uid()) is not null and coalesce(((select auth.jwt())->>'is_anonymous'),'false') <> 'true' and (select auth.uid())=user_id);

revoke all on public.study_exam_question_skills,public.study_exam_simulations,public.study_exam_simulation_items from anon;
grant select,insert,update,delete on public.study_exam_question_skills,public.study_exam_simulations,public.study_exam_simulation_items to authenticated;

create index if not exists study_exam_question_skills_user_skill_idx on public.study_exam_question_skills(user_id,skill_id);
create index if not exists study_exam_simulations_user_course_idx on public.study_exam_simulations(user_id,course_id,started_at desc);
create index if not exists study_exam_simulations_active_idx on public.study_exam_simulations(user_id,exam_id,status) where status in ('in_progress','grading');
create index if not exists study_exam_simulation_items_user_course_idx on public.study_exam_simulation_items(user_id,course_id,simulation_id);
create index if not exists study_exam_simulation_items_skill_question_idx on public.study_exam_simulation_items(user_id,study_question_id) where study_question_id is not null;

create index if not exists study_exams_course_owner_idx on public.study_exams(course_id,user_id);
create index if not exists study_exams_resource_owner_idx on public.study_exams(source_resource_id,user_id) where source_resource_id is not null;
create index if not exists study_exams_solution_resource_idx on public.study_exams(solution_resource_id) where solution_resource_id is not null;
create index if not exists study_exam_questions_exam_owner_idx on public.study_exam_questions(exam_id,user_id);
create index if not exists study_exam_questions_skill_owner_idx on public.study_exam_questions(primary_skill_id,user_id) where primary_skill_id is not null;
create index if not exists study_exam_questions_solution_resource_idx on public.study_exam_questions(solution_resource_id) where solution_resource_id is not null;
create index if not exists study_exam_questions_study_question_fk_idx on public.study_exam_questions(study_question_id) where study_question_id is not null;
create index if not exists study_exam_question_skills_skill_fk_idx on public.study_exam_question_skills(skill_id);
create index if not exists study_exam_simulations_course_fk_idx on public.study_exam_simulations(course_id);
create index if not exists study_exam_simulations_exam_fk_idx on public.study_exam_simulations(exam_id);
create index if not exists study_exam_simulation_items_course_fk_idx on public.study_exam_simulation_items(course_id);
create index if not exists study_exam_simulation_items_exam_question_fk_idx on public.study_exam_simulation_items(exam_question_id);
create index if not exists study_exam_simulation_items_study_question_fk_idx on public.study_exam_simulation_items(study_question_id) where study_question_id is not null;
create index if not exists study_exam_simulation_items_attempt_fk_idx on public.study_exam_simulation_items(attempt_id) where attempt_id is not null;
