CREATE OR REPLACE FUNCTION public.study_abandon_exam_simulation(p_simulation_id uuid, p_ended_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  update public.study_exam_simulations
  set status='abandoned',completed_at=p_ended_at,updated_at=now()
  where id=p_simulation_id and user_id=v_user and status in ('in_progress','grading');
  if not found then raise exception 'active simulation not found'; end if;

  perform public.study_finish_review_session(p_simulation_id,p_ended_at,'Exam simulation abandoned.');
  return jsonb_build_object('simulation_id',p_simulation_id,'status','abandoned');
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_finish_exam_simulation(p_simulation_id uuid, p_completed_at timestamp with time zone DEFAULT now(), p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_sim public.study_exam_simulations%rowtype;
  v_ungraded integer;
  v_awarded numeric;
  v_verified_awarded numeric;
  v_verified_max numeric;
  v_score numeric;
  v_verified_score numeric;
  v_coverage numeric;
  v_finish jsonb;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;

  select * into v_sim from public.study_exam_simulations
  where id=p_simulation_id and user_id=v_user for update;
  if not found then raise exception 'simulation not found'; end if;
  if v_sim.status='completed' then
    return jsonb_build_object(
      'simulation_id',v_sim.id,'status',v_sim.status,'score_percent',v_sim.score_percent,
      'verified_score_percent',v_sim.verified_score_percent,'verified_coverage_percent',v_sim.verified_coverage_percent
    );
  end if;
  if v_sim.status<>'grading' then raise exception 'simulation is not awaiting final grading'; end if;

  select count(*) filter(where awarded_points is null)::int,
         coalesce(sum(awarded_points),0),
         coalesce(sum(awarded_points) filter(where grading_status in ('official','verified')),0),
         coalesce(sum(max_points) filter(where grading_status in ('official','verified')),0)
  into v_ungraded,v_awarded,v_verified_awarded,v_verified_max
  from public.study_exam_simulation_items
  where simulation_id=p_simulation_id and user_id=v_user;

  if v_ungraded>0 then raise exception 'all simulation questions must be graded before completion'; end if;

  v_score := round(100*v_awarded/nullif(v_sim.total_points,0),1);
  v_verified_score := case when v_verified_max>0 then round(100*v_verified_awarded/v_verified_max,1) else null end;
  v_coverage := round(100*v_verified_max/nullif(v_sim.total_points,0),1);

  update public.study_exam_simulations
  set status='completed',completed_at=p_completed_at,
      awarded_points=v_awarded,verified_awarded_points=v_verified_awarded,
      verified_max_points=v_verified_max,score_percent=v_score,
      verified_score_percent=v_verified_score,verified_coverage_percent=v_coverage,
      note=nullif(left(coalesce(p_note,''),4000),''),
      updated_at=now()
  where id=p_simulation_id and user_id=v_user;

  v_finish := public.study_finish_review_session(
    p_simulation_id,p_completed_at,
    'Exam simulation completed. Raw score '||v_score||'%; verified grading coverage '||v_coverage||'%.'
  );

  return jsonb_build_object(
    'simulation_id',p_simulation_id,'status','completed',
    'awarded_points',v_awarded,'total_points',v_sim.total_points,'score_percent',v_score,
    'verified_awarded_points',v_verified_awarded,'verified_max_points',v_verified_max,
    'verified_score_percent',v_verified_score,'verified_coverage_percent',v_coverage,
    'session',v_finish
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_grade_exam_simulation_item(p_simulation_id uuid, p_exam_question_id uuid, p_awarded_points numeric, p_error_types study_error_type[] DEFAULT '{}'::study_error_type[], p_self_confidence smallint DEFAULT NULL::smallint, p_graded_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_item public.study_exam_simulation_items%rowtype;
  v_eq public.study_exam_questions%rowtype;
  v_status public.study_exam_grading_status;
  v_ratio numeric;
  v_result public.study_attempt_result;
  v_attempt jsonb;
  v_attempt_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if p_self_confidence is not null and p_self_confidence not between 1 and 5 then raise exception 'confidence out of range'; end if;
  if not exists(
    select 1 from public.study_exam_simulations
    where id=p_simulation_id and user_id=v_user and status='grading'
  ) then raise exception 'simulation is not awaiting grading'; end if;

  select * into v_item
  from public.study_exam_simulation_items
  where simulation_id=p_simulation_id and exam_question_id=p_exam_question_id and user_id=v_user
  for update;
  if not found then raise exception 'simulation question not found'; end if;
  if p_awarded_points<0 or p_awarded_points>v_item.max_points then raise exception 'awarded points out of range'; end if;

  select * into v_eq
  from public.study_exam_questions
  where id=p_exam_question_id and user_id=v_user;

  v_ratio := case when v_item.max_points>0 then p_awarded_points/v_item.max_points else 0 end;
  if v_ratio<1 and cardinality(coalesce(p_error_types,'{}'::public.study_error_type[]))=0 then
    raise exception 'lost points require at least one error diagnosis';
  end if;

  v_status := case v_eq.answer_status
    when 'official' then 'official'::public.study_exam_grading_status
    when 'verified' then 'verified'::public.study_exam_grading_status
    else 'provisional'::public.study_exam_grading_status
  end;

  if v_status in ('official','verified') and v_item.attempt_id is null and v_item.study_question_id is not null then
    v_result := case when v_ratio>=0.85 then 'correct'::public.study_attempt_result
                     when v_ratio>=0.40 then 'partial'::public.study_attempt_result
                     else 'incorrect'::public.study_attempt_result end;

    v_attempt := public.study_record_attempt_v3(
      gen_random_uuid(),
      v_item.study_question_id,
      v_result,
      'independent'::public.study_independence,
      p_simulation_id,
      (select started_at from public.study_exam_simulations where id=p_simulation_id and user_id=v_user),
      v_item.duration_seconds,
      v_item.response_text,
      p_self_confidence,
      coalesce(p_error_types,'{}'::public.study_error_type[]),
      p_graded_at
    );
    v_attempt_id := (v_attempt->>'attempt_id')::uuid;
  else
    v_attempt_id := v_item.attempt_id;
  end if;

  update public.study_exam_simulation_items
  set awarded_points=p_awarded_points,error_types=coalesce(p_error_types,'{}'::public.study_error_type[]),
      self_confidence=p_self_confidence,grading_status=v_status,
      attempt_id=coalesce(v_attempt_id,attempt_id),graded_at=p_graded_at,updated_at=now()
  where simulation_id=p_simulation_id and exam_question_id=p_exam_question_id and user_id=v_user;

  return jsonb_build_object(
    'simulation_id',p_simulation_id,'exam_question_id',p_exam_question_id,
    'awarded_points',p_awarded_points,'max_points',v_item.max_points,
    'grading_status',v_status,'mastery_credited',v_status in ('official','verified'),
    'attempt_id',v_attempt_id
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_save_exam_simulation_response(p_simulation_id uuid, p_exam_question_id uuid, p_response_text text DEFAULT NULL::text, p_duration_seconds integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if p_duration_seconds<0 or p_duration_seconds>43200 then raise exception 'duration out of range'; end if;
  if not exists(
    select 1 from public.study_exam_simulations
    where id=p_simulation_id and user_id=v_user and status='in_progress'
  ) then raise exception 'simulation is not in progress'; end if;

  update public.study_exam_simulation_items
  set response_text=case when p_response_text is null then null else left(p_response_text,50000) end,
      duration_seconds=p_duration_seconds,
      updated_at=now()
  where simulation_id=p_simulation_id and exam_question_id=p_exam_question_id and user_id=v_user;
  if not found then raise exception 'simulation question not found'; end if;

  return jsonb_build_object('simulation_id',p_simulation_id,'exam_question_id',p_exam_question_id,'saved',true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_start_exam_simulation(p_session_id uuid, p_exam_id uuid, p_started_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_exam public.study_exams%rowtype;
  v_duration integer;
  v_total numeric;
  v_question_count integer;
  v_invalid_count integer;
  v_existing public.study_exam_simulations%rowtype;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if p_started_at>now()+interval '5 minutes' then raise exception 'started_at is in the future'; end if;

  select * into v_existing
  from public.study_exam_simulations
  where user_id=v_user and exam_id=p_exam_id and status in ('in_progress','grading')
  order by started_at desc
  limit 1;
  if found then
    return jsonb_build_object(
      'simulation_id',v_existing.id,'exam_id',v_existing.exam_id,'status',v_existing.status,
      'started_at',v_existing.started_at,'duration_minutes',v_existing.duration_minutes,
      'total_points',v_existing.total_points,'resumed',true
    );
  end if;

  select * into v_exam
  from public.study_exams
  where id=p_exam_id and user_id=v_user and active
  for update;
  if not found then raise exception 'exam not found'; end if;

  select coalesce(v_exam.duration_minutes,c.exam_duration_minutes)
    into v_duration
  from public.study_courses c
  where c.id=v_exam.course_id and c.user_id=v_user;

  select count(*)::int,
         count(*) filter(where q.points is null or q.points<=0 or q.study_question_id is null or nullif(btrim(q.prompt_text),'') is null)::int,
         coalesce(v_exam.total_points,sum(q.points))
    into v_question_count,v_invalid_count,v_total
  from public.study_exam_questions q
  where q.user_id=v_user and q.exam_id=v_exam.id and q.active;

  if v_question_count=0 then raise exception 'exam has no active questions'; end if;
  if v_invalid_count>0 then raise exception 'exam is not simulation-ready: every active question needs points, prompt, and study question mapping'; end if;
  if v_duration is null or v_duration<10 then raise exception 'exam duration is not configured'; end if;
  if v_total is null or v_total<=0 then raise exception 'exam total points are not configured'; end if;

  insert into public.study_sessions(id,user_id,course_id,session_type,planned_minutes,started_at)
  values(p_session_id,v_user,v_exam.course_id,'exam_simulation',v_duration::smallint,p_started_at);

  insert into public.study_exam_simulations(
    id,user_id,course_id,exam_id,status,duration_minutes,total_points,started_at
  ) values(
    p_session_id,v_user,v_exam.course_id,v_exam.id,'in_progress',v_duration::smallint,v_total,p_started_at
  );

  insert into public.study_exam_simulation_items(
    simulation_id,exam_question_id,user_id,course_id,study_question_id,
    question_no,sort_order,max_points
  )
  select p_session_id,q.id,v_user,v_exam.course_id,q.study_question_id,
         q.question_no,q.sort_order,q.points
  from public.study_exam_questions q
  where q.user_id=v_user and q.exam_id=v_exam.id and q.active
  order by q.sort_order,q.question_no;

  return jsonb_build_object(
    'simulation_id',p_session_id,'exam_id',v_exam.id,'status','in_progress',
    'started_at',p_started_at,'duration_minutes',v_duration,'total_points',v_total,
    'question_count',v_question_count,'resumed',false
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_submit_exam_simulation(p_simulation_id uuid, p_responses jsonb DEFAULT '[]'::jsonb, p_submitted_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_sim public.study_exam_simulations%rowtype;
  v_response jsonb;
  v_qid uuid;
  v_duration integer;
  v_used integer;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if jsonb_typeof(coalesce(p_responses,'[]'::jsonb))<>'array' then raise exception 'responses must be an array'; end if;

  select * into v_sim from public.study_exam_simulations
  where id=p_simulation_id and user_id=v_user for update;
  if not found then raise exception 'simulation not found'; end if;
  if v_sim.status<>'in_progress' then
    return jsonb_build_object('simulation_id',v_sim.id,'status',v_sim.status,'submitted_at',v_sim.submitted_at);
  end if;
  if p_submitted_at<v_sim.started_at then raise exception 'submitted_at before start'; end if;

  for v_response in select value from jsonb_array_elements(coalesce(p_responses,'[]'::jsonb))
  loop
    begin v_qid := (v_response->>'exam_question_id')::uuid;
    exception when others then raise exception 'invalid exam_question_id in responses'; end;
    v_duration := case when coalesce(v_response->>'duration_seconds','') ~ '^[0-9]+$'
      then least(43200,(v_response->>'duration_seconds')::integer) else 0 end;

    update public.study_exam_simulation_items
    set response_text=case when v_response ? 'response_text' then left(v_response->>'response_text',50000) else response_text end,
        duration_seconds=v_duration,
        updated_at=now()
    where simulation_id=p_simulation_id and exam_question_id=v_qid and user_id=v_user;
    if not found then raise exception 'response references question outside simulation'; end if;
  end loop;

  v_used := least(86400,greatest(0,ceil(extract(epoch from (p_submitted_at-v_sim.started_at)))::integer));
  update public.study_exam_simulations
  set status='grading',submitted_at=p_submitted_at,time_used_seconds=v_used,updated_at=now()
  where id=p_simulation_id and user_id=v_user;

  return jsonb_build_object(
    'simulation_id',p_simulation_id,'status','grading','submitted_at',p_submitted_at,
    'time_used_seconds',v_used
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_update_exam_metadata(p_exam_id uuid, p_syllabus_relevance numeric, p_active boolean, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_exam public.study_exams%rowtype;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then raise exception 'permanent account required'; end if;
  if p_syllabus_relevance is null or p_syllabus_relevance<0 or p_syllabus_relevance>1 then
    raise exception 'syllabus relevance out of range';
  end if;

  update public.study_exams
  set syllabus_relevance=p_syllabus_relevance,
      active=p_active,
      notes=nullif(left(coalesce(p_notes,''),4000),''),
      updated_at=now()
  where id=p_exam_id and user_id=v_user
  returning * into v_exam;

  if not found then raise exception 'exam not found'; end if;
  return jsonb_build_object(
    'exam_id',v_exam.id,'syllabus_relevance',v_exam.syllabus_relevance,
    'active',v_exam.active,'notes',v_exam.notes
  );
end;
$function$;
revoke all on function public.study_update_exam_metadata(uuid,numeric,boolean,text) from public,anon;
grant execute on function public.study_update_exam_metadata(uuid,numeric,boolean,text) to authenticated;
revoke all on function public.study_start_exam_simulation(uuid,uuid,timestamptz) from public,anon;
grant execute on function public.study_start_exam_simulation(uuid,uuid,timestamptz) to authenticated;
revoke all on function public.study_save_exam_simulation_response(uuid,uuid,text,integer) from public,anon;
grant execute on function public.study_save_exam_simulation_response(uuid,uuid,text,integer) to authenticated;
revoke all on function public.study_submit_exam_simulation(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.study_submit_exam_simulation(uuid,jsonb,timestamptz) to authenticated;
revoke all on function public.study_grade_exam_simulation_item(uuid,uuid,numeric,public.study_error_type[],smallint,timestamptz) from public,anon;
grant execute on function public.study_grade_exam_simulation_item(uuid,uuid,numeric,public.study_error_type[],smallint,timestamptz) to authenticated;
revoke all on function public.study_finish_exam_simulation(uuid,timestamptz,text) from public,anon;
grant execute on function public.study_finish_exam_simulation(uuid,timestamptz,text) to authenticated;
revoke all on function public.study_abandon_exam_simulation(uuid,timestamptz) from public,anon;
grant execute on function public.study_abandon_exam_simulation(uuid,timestamptz) to authenticated;
