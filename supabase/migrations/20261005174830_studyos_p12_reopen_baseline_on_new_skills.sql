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
  values(v_user,v_semester,p_course_id,'in_progress'::public.study_baseline_status,now())
  on conflict(user_id,course_id) do update
    set status='in_progress'::public.study_baseline_status,
        started_at=coalesce(public.study_baseline_diagnostics.started_at,now()),
        completed_at=null,
        updated_at=now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.study_start_baseline(uuid) from public,anon;
grant execute on function public.study_start_baseline(uuid) to authenticated;

create or replace view public.study_baseline_summary
with (security_invoker=true)
as
select
  c.user_id,c.semester_id,c.id as course_id,c.stable_key,c.display_name,c.short_name,
  case
    when d.status='completed'::public.study_baseline_status
      and count(distinct s.id)>count(distinct r.skill_id)
      then 'in_progress'::public.study_baseline_status
    else coalesce(d.status,'not_started'::public.study_baseline_status)
  end as status,
  d.started_at,
  case
    when d.status='completed'::public.study_baseline_status
      and count(distinct s.id)=count(distinct r.skill_id)
      and count(distinct s.id)>0
      then d.completed_at
    else null
  end as completed_at,
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
