CREATE OR REPLACE FUNCTION public.study_p9_apply_exam_ingestion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_type public.study_resource_type;
  v_authority public.study_source_authority;
  v_exam_payload jsonb;
  v_solution_payload jsonb;
  v_q jsonb;
  v_answer jsonb;
  v_exam_id uuid;
  v_eq_id uuid;
  v_sq_id uuid;
  v_primary_skill_id uuid;
  v_skill_id uuid;
  v_exam_key text;
  v_qno text;
  v_points numeric;
  v_total_points numeric;
  v_duration integer;
  v_expected numeric;
  v_sort smallint := 0;
  v_answer_status public.study_exam_answer_status;
  v_page integer;
  v_page_end integer;
  v_section text;
  v_source_conf numeric;
begin
  if old.status is not distinct from new.status or new.status<>'accepted' or new.candidate_payload is null then
    return new;
  end if;

  select r.resource_type,r.source_authority
    into v_type,v_authority
  from public.study_resources r
  where r.id=new.resource_id and r.user_id=new.user_id;

  if v_type='exam' then
    v_exam_payload := new.candidate_payload->'exam';
    if v_exam_payload is null then return new; end if;
    v_exam_key := btrim(v_exam_payload->>'stable_key');

    select id into v_exam_id
    from public.study_exams
    where user_id=new.user_id and course_id=new.course_id and stable_key=v_exam_key
    for update;

    v_duration := case when coalesce(v_exam_payload->>'duration_minutes','') ~ '^[0-9]+$'
      then (v_exam_payload->>'duration_minutes')::integer else null end;
    v_total_points := case when coalesce(v_exam_payload->>'total_points','') ~ '^[0-9]+([.][0-9]+)?$'
      then (v_exam_payload->>'total_points')::numeric else null end;

    if v_exam_id is null then
      insert into public.study_exams(
        user_id,course_id,source_resource_id,stable_key,title,exam_at,year_label,
        duration_minutes,total_points,official,active,syllabus_relevance,notes
      )
      values(
        new.user_id,new.course_id,new.resource_id,v_exam_key,btrim(v_exam_payload->>'title'),
        case when coalesce(v_exam_payload->>'exam_at','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then (v_exam_payload->>'exam_at')::timestamptz else null end,
        nullif(btrim(v_exam_payload->>'year_label'),''),
        v_duration,v_total_points,
        v_authority in ('official_course','official_solution'),true,
        case when coalesce(v_exam_payload->>'syllabus_relevance','') ~ '^([01]([.][0-9]+)?|0?[.][0-9]+)$'
          then (v_exam_payload->>'syllabus_relevance')::numeric else 1 end,
        nullif(v_exam_payload->>'notes','')
      )
      returning id into v_exam_id;
    else
      update public.study_exams
      set source_resource_id=new.resource_id,
          title=btrim(v_exam_payload->>'title'),
          exam_at=case when coalesce(v_exam_payload->>'exam_at','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then (v_exam_payload->>'exam_at')::timestamptz else exam_at end,
          year_label=coalesce(nullif(btrim(v_exam_payload->>'year_label'),''),year_label),
          duration_minutes=coalesce(v_duration,duration_minutes),
          total_points=coalesce(v_total_points,total_points),
          official=v_authority in ('official_course','official_solution'),
          active=true,
          syllabus_relevance=case when coalesce(v_exam_payload->>'syllabus_relevance','') ~ '^([01]([.][0-9]+)?|0?[.][0-9]+)$'
            then (v_exam_payload->>'syllabus_relevance')::numeric else syllabus_relevance end,
          notes=coalesce(nullif(v_exam_payload->>'notes',''),notes),
          updated_at=now()
      where id=v_exam_id and user_id=new.user_id;
    end if;

    update public.study_exam_questions
    set active=false,updated_at=now()
    where user_id=new.user_id and exam_id=v_exam_id;

    delete from public.study_exam_question_skills m
    using public.study_exam_questions eq
    where m.user_id=new.user_id and eq.user_id=m.user_id
      and eq.id=m.exam_question_id and eq.exam_id=v_exam_id;

    v_sort := 0;
    for v_q in select value from jsonb_array_elements(coalesce(v_exam_payload->'questions','[]'::jsonb))
    loop
      v_sort := v_sort+1;
      v_qno := btrim(v_q->>'question_no');
      select s.id into v_primary_skill_id
      from public.study_skills s
      where s.user_id=new.user_id and s.course_id=new.course_id
        and s.stable_key=btrim(v_q->>'primary_skill_key') and s.active;

      v_points := case when coalesce(v_q->>'points','') ~ '^[0-9]+([.][0-9]+)?$'
        then (v_q->>'points')::numeric else null end;
      v_page := case when coalesce(v_q#>>'{source,page_start}','') ~ '^[0-9]+$'
        then (v_q#>>'{source,page_start}')::integer else null end;
      v_page_end := case when coalesce(v_q#>>'{source,page_end}','') ~ '^[0-9]+$'
        then (v_q#>>'{source,page_end}')::integer else null end;
      v_section := nullif(v_q#>>'{source,section_label}','');
      v_source_conf := case when coalesce(v_q#>>'{source,confidence}','') ~ '^([01]([.][0-9]+)?|0?[.][0-9]+)$'
        then (v_q#>>'{source,confidence}')::numeric else 1 end;

      v_expected := case
        when v_points is not null and coalesce(v_total_points,0)>0 and coalesce(v_duration,0)>0
          then greatest(0.25,least(120,v_duration::numeric*v_points/v_total_points))
        when coalesce(v_q->>'expected_minutes','') ~ '^[0-9]+([.][0-9]+)?$'
          then greatest(0.25,least(120,(v_q->>'expected_minutes')::numeric))
        else 10 end;

      v_answer_status := case
        when nullif(btrim(v_q->>'answer_key_or_rubric'),'') is null then 'missing'::public.study_exam_answer_status
        when v_authority='official_solution' then 'official'::public.study_exam_answer_status
        when v_authority='official_course' and coalesce(v_q->>'answer_status','')='official'
          then 'official'::public.study_exam_answer_status
        else 'unverified'::public.study_exam_answer_status end;

      insert into public.study_questions(
        user_id,course_id,primary_skill_id,question_type,evidence_dimension,prompt,
        answer_key_or_rubric,difficulty,expected_minutes,source_confidence,origin,active,ingestion_run_id
      )
      values(
        new.user_id,new.course_id,v_primary_skill_id,'exam_problem','exam',
        btrim(v_q->>'prompt'),nullif(btrim(v_q->>'answer_key_or_rubric'),''),
        greatest(1,least(5,coalesce(nullif(v_q->>'difficulty','')::smallint,3))),
        v_expected,v_source_conf,'official',true,new.id
      )
      returning id into v_sq_id;

      insert into public.study_question_sources(
        user_id,question_id,resource_id,page_start,page_end,section_label,source_role
      ) values(
        new.user_id,v_sq_id,new.resource_id,v_page,v_page_end,v_section,'exam_reference'
      );

      select id into v_eq_id
      from public.study_exam_questions
      where user_id=new.user_id and exam_id=v_exam_id and question_no=v_qno
      for update;

      if v_eq_id is null then
        insert into public.study_exam_questions(
          user_id,exam_id,primary_skill_id,study_question_id,question_no,points,prompt_summary,
          prompt_text,difficulty,source_page,source_page_end,source_section,source_confidence,
          answer_key_or_rubric,answer_status,sort_order,active,updated_at
        ) values(
          new.user_id,v_exam_id,v_primary_skill_id,v_sq_id,v_qno,v_points,left(btrim(v_q->>'prompt'),500),
          btrim(v_q->>'prompt'),greatest(1,least(5,coalesce(nullif(v_q->>'difficulty','')::smallint,3))),
          v_page,v_page_end,v_section,v_source_conf,nullif(btrim(v_q->>'answer_key_or_rubric'),''),
          v_answer_status,v_sort,true,now()
        ) returning id into v_eq_id;
      else
        update public.study_exam_questions
        set primary_skill_id=v_primary_skill_id,study_question_id=v_sq_id,points=v_points,
            prompt_summary=left(btrim(v_q->>'prompt'),500),prompt_text=btrim(v_q->>'prompt'),
            difficulty=greatest(1,least(5,coalesce(nullif(v_q->>'difficulty','')::smallint,3))),
            source_page=v_page,source_page_end=v_page_end,source_section=v_section,
            source_confidence=v_source_conf,answer_key_or_rubric=nullif(btrim(v_q->>'answer_key_or_rubric'),''),
            answer_status=v_answer_status,sort_order=v_sort,active=true,updated_at=now()
        where id=v_eq_id and user_id=new.user_id;
      end if;

      insert into public.study_exam_question_skills(exam_question_id,skill_id,user_id,role,weight)
      values(v_eq_id,v_primary_skill_id,new.user_id,'primary',1)
      on conflict(exam_question_id,skill_id) do update set role='primary',weight=1;

      if jsonb_typeof(coalesce(v_q->'skill_keys','[]'::jsonb))='array' then
        for v_skill_id in
          select s.id
          from jsonb_array_elements_text(coalesce(v_q->'skill_keys','[]'::jsonb)) k(value)
          join public.study_skills s
            on s.user_id=new.user_id and s.course_id=new.course_id and s.stable_key=k.value and s.active
          where s.id<>v_primary_skill_id
        loop
          insert into public.study_exam_question_skills(exam_question_id,skill_id,user_id,role,weight)
          values(v_eq_id,v_skill_id,new.user_id,'secondary',0.5)
          on conflict(exam_question_id,skill_id) do update set role='secondary',weight=0.5;
        end loop;
      end if;
    end loop;

    if v_total_points is null then
      select sum(points) into v_total_points
      from public.study_exam_questions
      where user_id=new.user_id and exam_id=v_exam_id and active and points is not null;
      if v_total_points is not null then
        update public.study_exams set total_points=v_total_points,updated_at=now()
        where id=v_exam_id and user_id=new.user_id;
      end if;
    end if;

    if v_duration is null then
      update public.study_exams e
      set duration_minutes=coalesce(e.duration_minutes,c.exam_duration_minutes),updated_at=now()
      from public.study_courses c
      where e.id=v_exam_id and e.user_id=new.user_id
        and c.id=e.course_id and c.user_id=e.user_id;
    end if;

  elsif v_type='exam_solution' then
    v_solution_payload := new.candidate_payload->'exam_solution';
    if v_solution_payload is null then return new; end if;
    v_exam_key := btrim(v_solution_payload->>'exam_stable_key');

    select id into v_exam_id
    from public.study_exams
    where user_id=new.user_id and course_id=new.course_id and stable_key=v_exam_key and active
    for update;
    if v_exam_id is null then return new; end if;

    update public.study_exams
    set solution_resource_id=new.resource_id,updated_at=now()
    where id=v_exam_id and user_id=new.user_id;

    for v_answer in select value from jsonb_array_elements(coalesce(v_solution_payload->'answers','[]'::jsonb))
    loop
      v_qno := btrim(v_answer->>'question_no');
      select id,study_question_id into v_eq_id,v_sq_id
      from public.study_exam_questions
      where user_id=new.user_id and exam_id=v_exam_id and question_no=v_qno and active
      for update;
      if v_eq_id is null then continue; end if;

      v_page := case when coalesce(v_answer#>>'{source,page_start}','') ~ '^[0-9]+$'
        then (v_answer#>>'{source,page_start}')::integer else null end;
      v_section := nullif(v_answer#>>'{source,section_label}','');
      v_answer_status := case
        when v_authority in ('official_solution','official_course') then 'official'::public.study_exam_answer_status
        else 'unverified'::public.study_exam_answer_status end;

      update public.study_exam_questions
      set answer_key_or_rubric=btrim(v_answer->>'answer_key_or_rubric'),
          answer_status=v_answer_status,solution_resource_id=new.resource_id,
          solution_page=v_page,solution_section=v_section,updated_at=now()
      where id=v_eq_id and user_id=new.user_id;

      if v_sq_id is not null then
        update public.study_questions
        set answer_key_or_rubric=btrim(v_answer->>'answer_key_or_rubric'),updated_at=now()
        where id=v_sq_id and user_id=new.user_id;
        insert into public.study_question_sources(
          user_id,question_id,resource_id,page_start,page_end,section_label,source_role
        ) values(
          new.user_id,v_sq_id,new.resource_id,v_page,
          case when coalesce(v_answer#>>'{source,page_end}','') ~ '^[0-9]+$'
            then (v_answer#>>'{source,page_end}')::integer else null end,
          v_section,'answer'
        );
      end if;
    end loop;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_p9_validate_exam_candidate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_type public.study_resource_type;
  v_authority public.study_source_authority;
  v_course_id uuid;
  v_issues jsonb := '[]'::jsonb;
  v_item jsonb;
  v_exam jsonb;
  v_solution jsonb;
  v_q jsonb;
  v_answer jsonb;
  v_key text;
  v_qno text;
  v_qnos text[] := '{}';
  v_candidate_skill_keys text[] := '{}';
  v_skill_key text;
  v_exam_id uuid;
  v_count integer;
  v_sum_points numeric := 0;
  v_total_points numeric;
begin
  if new.status <> 'candidate' or new.candidate_payload is null then return new; end if;

  select r.resource_type,r.source_authority,new.course_id
    into v_type,v_authority,v_course_id
  from public.study_resources r
  where r.id=new.resource_id and r.user_id=new.user_id;

  -- Preserve P7 validation, but remove warnings/errors that are intentionally
  -- replaced by the exam-specific contract and remove stale P9 issues on resubmit.
  for v_item in select value from jsonb_array_elements(coalesce(new.validation_issues,'[]'::jsonb))
  loop
    if coalesce(v_item->>'code','') like 'p9_%' then continue; end if;
    if v_type in ('exam','exam_solution')
       and v_item->>'code' in ('no_topics','skill_without_questions') then continue; end if;
    v_issues := v_issues || jsonb_build_array(v_item);
  end loop;

  select coalesce(array_agg(distinct s->>'stable_key') filter(where nullif(s->>'stable_key','') is not null),'{}'::text[])
    into v_candidate_skill_keys
  from jsonb_array_elements(coalesce(new.candidate_payload->'topics','[]'::jsonb)) t,
       jsonb_array_elements(coalesce(t->'skills','[]'::jsonb)) s;

  if v_type='exam' then
    v_exam := new.candidate_payload->'exam';
    if v_exam is null or jsonb_typeof(v_exam)<>'object' then
      new.validation_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','p9_exam_missing','severity','error','message','Exam resources require a top-level exam object.'
      ));
      return new;
    end if;

    v_key := nullif(btrim(v_exam->>'stable_key'),'');
    if v_key is null or v_key !~ '^[a-z0-9][a-z0-9_:-]{1,119}$' then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','p9_exam_key_invalid','severity','error','message','Exam stable_key is missing or invalid.'
      ));
    end if;

    if nullif(btrim(v_exam->>'title'),'') is null then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','p9_exam_title_missing','severity','error','message','Exam title is required.'
      ));
    end if;

    if (v_exam->>'duration_minutes') is not null and (
      (v_exam->>'duration_minutes') !~ '^[0-9]+$'
      or (v_exam->>'duration_minutes')::integer not between 10 and 600
    ) then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','p9_exam_duration_invalid','severity','error','message','Exam duration must be 10–600 minutes.'
      ));
    end if;

    if (v_exam->>'syllabus_relevance') is not null and (
      (v_exam->>'syllabus_relevance') !~ '^([01]([.][0-9]+)?|0?[.][0-9]+)$'
      or (v_exam->>'syllabus_relevance')::numeric not between 0 and 1
    ) then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','p9_exam_relevance_invalid','severity','error','message','syllabus_relevance must be between 0 and 1.'
      ));
    end if;

    if jsonb_typeof(coalesce(v_exam->'questions','[]'::jsonb))<>'array' then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','p9_exam_questions_invalid','severity','error','message','Exam questions must be an array.'
      ));
    else
      v_count := jsonb_array_length(coalesce(v_exam->'questions','[]'::jsonb));
      if v_count=0 then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','p9_exam_questions_missing','severity','error','message','No numbered exam questions were extracted.'
        ));
      elsif v_count>120 then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','p9_exam_questions_excessive','severity','error','message','Exam candidate exceeds 120 numbered questions.'
        ));
      end if;

      for v_q in select value from jsonb_array_elements(coalesce(v_exam->'questions','[]'::jsonb))
      loop
        v_qno := nullif(btrim(v_q->>'question_no'),'');
        if v_qno is null then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','p9_exam_question_no_missing','severity','error','message','Every exam question requires question_no.'
          ));
        elsif v_qno=any(v_qnos) then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','p9_exam_question_no_duplicate','severity','error','message','Exam question_no is duplicated.','question_no',v_qno
          ));
        else
          v_qnos := array_append(v_qnos,v_qno);
        end if;

        if nullif(btrim(v_q->>'prompt'),'') is null then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','p9_exam_prompt_missing','severity','error','message','Every exam question requires its prompt.','question_no',v_qno
          ));
        end if;

        if not public.study_candidate_has_anchor(v_q->'source') then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','p9_exam_question_unanchored','severity','error','message','Every exam question must point to a page or named section.','question_no',v_qno
          ));
        end if;

        if (v_q->>'points') is null or (v_q->>'points') !~ '^[0-9]+([.][0-9]+)?$' or (v_q->>'points')::numeric<=0 then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','p9_exam_points_missing','severity','warning','message','Question points are missing; this paper cannot be fully timed/scored until points are known.','question_no',v_qno
          ));
        else
          v_sum_points := v_sum_points+(v_q->>'points')::numeric;
        end if;

        if (v_q->>'difficulty') is not null and (
          (v_q->>'difficulty') !~ '^[1-5]$'
        ) then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','p9_exam_difficulty_invalid','severity','error','message','Exam question difficulty must be 1–5.','question_no',v_qno
          ));
        end if;

        v_skill_key := nullif(btrim(v_q->>'primary_skill_key'),'');
        if v_skill_key is null then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','p9_exam_primary_skill_missing','severity','error','message','Every exam question needs primary_skill_key.','question_no',v_qno
          ));
        elsif not (v_skill_key=any(v_candidate_skill_keys)) and not exists(
          select 1 from public.study_skills s
          where s.user_id=new.user_id and s.course_id=v_course_id and s.stable_key=v_skill_key and s.active
        ) then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','p9_exam_primary_skill_unknown','severity','error','message','Exam primary_skill_key is not in the candidate or existing course map.','question_no',v_qno,'skill_key',v_skill_key
          ));
        end if;

        if v_q ? 'skill_keys' then
          if jsonb_typeof(v_q->'skill_keys')<>'array' then
            v_issues := v_issues || jsonb_build_array(jsonb_build_object(
              'code','p9_exam_skill_keys_invalid','severity','error','message','skill_keys must be an array.','question_no',v_qno
            ));
          else
            for v_skill_key in select value from jsonb_array_elements_text(v_q->'skill_keys')
            loop
              if not (v_skill_key=any(v_candidate_skill_keys)) and not exists(
                select 1 from public.study_skills s
                where s.user_id=new.user_id and s.course_id=v_course_id and s.stable_key=v_skill_key and s.active
              ) then
                v_issues := v_issues || jsonb_build_array(jsonb_build_object(
                  'code','p9_exam_skill_unknown','severity','error','message','Exam skill key is not in the candidate or existing course map.','question_no',v_qno,'skill_key',v_skill_key
                ));
              end if;
            end loop;
          end if;
        end if;
      end loop;
    end if;

    if (v_exam->>'total_points') is not null then
      if (v_exam->>'total_points') !~ '^[0-9]+([.][0-9]+)?$' or (v_exam->>'total_points')::numeric<=0 then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','p9_exam_total_points_invalid','severity','error','message','Exam total_points must be positive.'
        ));
      else
        v_total_points := (v_exam->>'total_points')::numeric;
        if v_sum_points>0 and abs(v_total_points-v_sum_points)>0.5 then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','p9_exam_points_mismatch','severity','warning','message','Sum of extracted question points does not match exam total_points.',
            'declared',v_total_points,'question_sum',v_sum_points
          ));
        end if;
      end if;
    end if;

  elsif v_type='exam_solution' then
    v_solution := new.candidate_payload->'exam_solution';
    if v_solution is null or jsonb_typeof(v_solution)<>'object' then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','p9_exam_solution_missing','severity','error','message','Exam-solution resources require a top-level exam_solution object.'
      ));
    else
      v_key := nullif(btrim(v_solution->>'exam_stable_key'),'');
      select e.id into v_exam_id
      from public.study_exams e
      where e.user_id=new.user_id and e.course_id=v_course_id and e.stable_key=v_key and e.active;
      if v_key is null or v_exam_id is null then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','p9_exam_solution_target_unknown','severity','error','message','exam_solution.exam_stable_key must match an existing active past paper.'
        ));
      end if;

      if jsonb_typeof(coalesce(v_solution->'answers','[]'::jsonb))<>'array'
         or jsonb_array_length(coalesce(v_solution->'answers','[]'::jsonb))=0 then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','p9_exam_solution_answers_missing','severity','error','message','Exam solution must contain at least one numbered answer.'
        ));
      else
        for v_answer in select value from jsonb_array_elements(v_solution->'answers')
        loop
          v_qno := nullif(btrim(v_answer->>'question_no'),'');
          if v_qno is null or v_exam_id is null or not exists(
            select 1 from public.study_exam_questions q
            where q.user_id=new.user_id and q.exam_id=v_exam_id and q.question_no=v_qno and q.active
          ) then
            v_issues := v_issues || jsonb_build_array(jsonb_build_object(
              'code','p9_exam_solution_question_unknown','severity','error','message','Solution question_no does not match the target exam.','question_no',v_qno
            ));
          end if;
          if nullif(btrim(v_answer->>'answer_key_or_rubric'),'') is null then
            v_issues := v_issues || jsonb_build_array(jsonb_build_object(
              'code','p9_exam_solution_rubric_missing','severity','error','message','Every solution answer needs an answer key or grading rubric.','question_no',v_qno
            ));
          end if;
          if not public.study_candidate_has_anchor(v_answer->'source') then
            v_issues := v_issues || jsonb_build_array(jsonb_build_object(
              'code','p9_exam_solution_unanchored','severity','error','message','Every solution answer must point to its solution page or named section.','question_no',v_qno
            ));
          end if;
        end loop;
      end if;
    end if;
  end if;

  new.validation_issues := v_issues;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.study_record_attempt_v3(p_request_id uuid, p_question_id uuid, p_result study_attempt_result, p_independence study_independence, p_session_id uuid DEFAULT NULL::uuid, p_started_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_duration_seconds integer DEFAULT NULL::integer, p_response_text text DEFAULT NULL::text, p_self_confidence smallint DEFAULT NULL::smallint, p_error_types study_error_type[] DEFAULT '{}'::study_error_type[], p_completed_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_inserted boolean := false;
  v_existing_question uuid;
  v_existing_session uuid;
  v_response jsonb;
  v_attempt_id uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'true' then
    raise exception 'permanent account required';
  end if;
  if p_started_at is not null and p_started_at > p_completed_at then
    raise exception 'started_at after completed_at';
  end if;

  if p_session_id is not null and not exists (
    select 1 from public.study_sessions
    where id=p_session_id and user_id=v_user
  ) then
    raise exception 'study session not found';
  end if;

  insert into public.study_attempt_requests(
    user_id, request_id, question_id, session_id, started_at
  )
  values (
    v_user, p_request_id, p_question_id, p_session_id, p_started_at
  )
  on conflict (user_id, request_id) do nothing
  returning true into v_inserted;

  if not coalesce(v_inserted,false) then
    select question_id, session_id, response
      into v_existing_question, v_existing_session, v_response
    from public.study_attempt_requests
    where user_id=v_user and request_id=p_request_id;

    if v_existing_question is distinct from p_question_id then
      raise exception 'request_id reused for a different question';
    end if;
    if v_existing_session is distinct from p_session_id then
      raise exception 'request_id reused for a different session';
    end if;
    if v_response is null then
      raise exception 'attempt request is still processing';
    end if;
    return v_response;
  end if;

  v_response := public.study_record_attempt(
    p_question_id,
    p_result,
    p_independence,
    p_duration_seconds,
    p_response_text,
    p_self_confidence,
    p_error_types,
    p_completed_at
  );

  v_attempt_id := (v_response->>'attempt_id')::uuid;

  update public.study_attempts
  set session_id=p_session_id,
      started_at=p_started_at
  where id=v_attempt_id and user_id=v_user;

  update public.study_attempt_requests
  set response=v_response,
      completed_at=now()
  where user_id=v_user and request_id=p_request_id;

  return v_response || jsonb_build_object('session_id',p_session_id);
end;
$function$;

drop trigger if exists study_p9_validate_exam_candidate_trigger on public.study_ingestion_runs;
create trigger study_p9_validate_exam_candidate_trigger
before update of candidate_payload,status,validation_issues on public.study_ingestion_runs
for each row
when (new.status='candidate' and new.candidate_payload is not null)
execute function public.study_p9_validate_exam_candidate();

drop trigger if exists study_p9_apply_exam_ingestion_trigger on public.study_ingestion_runs;
create trigger study_p9_apply_exam_ingestion_trigger
after update of status on public.study_ingestion_runs
for each row
when (old.status is distinct from new.status and new.status='accepted')
execute function public.study_p9_apply_exam_ingestion();

revoke all on function public.study_p9_validate_exam_candidate() from anon,authenticated,public;
revoke all on function public.study_p9_apply_exam_ingestion() from anon,authenticated,public;
