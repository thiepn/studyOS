create index study_week_plans_semester_id_idx
  on public.study_week_plans(semester_id);

create index study_week_allocations_course_id_idx
  on public.study_week_allocations(course_id);

drop policy if exists study_week_plans_owner_all on public.study_week_plans;
create policy study_week_plans_owner_all
on public.study_week_plans
for all
to authenticated
using (
  (select auth.uid()) is not null
  and coalesce((select auth.jwt()) ->> 'is_anonymous','false') <> 'true'
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and coalesce((select auth.jwt()) ->> 'is_anonymous','false') <> 'true'
  and (select auth.uid()) = user_id
);

drop policy if exists study_week_allocations_owner_all on public.study_week_allocations;
create policy study_week_allocations_owner_all
on public.study_week_allocations
for all
to authenticated
using (
  (select auth.uid()) is not null
  and coalesce((select auth.jwt()) ->> 'is_anonymous','false') <> 'true'
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
  and coalesce((select auth.jwt()) ->> 'is_anonymous','false') <> 'true'
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
