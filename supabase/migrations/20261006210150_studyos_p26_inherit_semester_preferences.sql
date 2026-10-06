create or replace function public.study_inherit_semester_preferences()
returns trigger
language plpgsql
set search_path to 'public','pg_temp'
as $function$
begin
  if new.previous_semester_id is null then
    return new;
  end if;

  insert into public.study_planning_settings(
    user_id,semester_id,default_mode,normal_budget_minutes,light_budget_minutes,
    recovery_budget_minutes,intensive_budget_minutes,light_review_budget_minutes,
    recovery_review_budget_minutes,max_focus_items,recovery_max_focus_items
  )
  select
    new.user_id,new.id,s.default_mode,s.normal_budget_minutes,s.light_budget_minutes,
    s.recovery_budget_minutes,s.intensive_budget_minutes,s.light_review_budget_minutes,
    s.recovery_review_budget_minutes,s.max_focus_items,s.recovery_max_focus_items
  from public.study_planning_settings s
  where s.user_id=new.user_id and s.semester_id=new.previous_semester_id
  on conflict(user_id,semester_id) do nothing;

  if not found then
    insert into public.study_planning_settings(user_id,semester_id)
    values(new.user_id,new.id)
    on conflict(user_id,semester_id) do nothing;
  end if;

  insert into public.study_calendar_planning_settings(
    user_id,semester_id,day_start,day_end,minimum_block_minutes,calendar_buffer_minutes,
    max_block_minutes,include_weekends,study_reminder_minutes,sync_past_days,sync_future_days
  )
  select
    new.user_id,new.id,s.day_start,s.day_end,s.minimum_block_minutes,s.calendar_buffer_minutes,
    s.max_block_minutes,s.include_weekends,s.study_reminder_minutes,s.sync_past_days,s.sync_future_days
  from public.study_calendar_planning_settings s
  where s.user_id=new.user_id and s.semester_id=new.previous_semester_id
  on conflict(user_id,semester_id) do nothing;

  if not found then
    insert into public.study_calendar_planning_settings(user_id,semester_id)
    values(new.user_id,new.id)
    on conflict(user_id,semester_id) do nothing;
  end if;

  return new;
end;
$function$;

drop trigger if exists study_semesters_inherit_preferences on public.study_semesters;
create trigger study_semesters_inherit_preferences
after insert on public.study_semesters
for each row
when (new.previous_semester_id is not null)
execute function public.study_inherit_semester_preferences();

revoke all on function public.study_inherit_semester_preferences() from public,anon,authenticated;
