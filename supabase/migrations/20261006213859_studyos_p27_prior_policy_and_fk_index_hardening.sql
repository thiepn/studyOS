drop policy if exists "study_course_historical_priors_insert_own" on public.study_course_historical_priors;
drop policy if exists "study_course_historical_priors_update_own" on public.study_course_historical_priors;
drop policy if exists "study_course_historical_priors_delete_own" on public.study_course_historical_priors;

create policy "study_course_historical_priors_insert_own"
on public.study_course_historical_priors for insert
to authenticated
with check (
  (select auth.uid())=user_id
  and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true'
);

create policy "study_course_historical_priors_update_own"
on public.study_course_historical_priors for update
to authenticated
using (
  (select auth.uid())=user_id
  and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true'
)
with check (
  (select auth.uid())=user_id
  and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true'
);

create policy "study_course_historical_priors_delete_own"
on public.study_course_historical_priors for delete
to authenticated
using (
  (select auth.uid())=user_id
  and coalesce((select auth.jwt())->>'is_anonymous','false')<>'true'
);

create index if not exists study_course_historical_priors_course_owner_idx
  on public.study_course_historical_priors(course_id,user_id);
create index if not exists study_course_historical_priors_semester_owner_idx
  on public.study_course_historical_priors(semester_id,user_id);
create index if not exists study_course_historical_priors_source_course_owner_idx
  on public.study_course_historical_priors(source_course_id,user_id);
create index if not exists study_course_historical_priors_source_semester_owner_idx
  on public.study_course_historical_priors(source_semester_id,user_id);
