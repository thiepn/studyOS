create or replace function public.study_submit_ingestion_candidate(
  p_run_id uuid,
  p_payload jsonb,
  p_processor text default null,
  p_processor_version text default null,
  p_extraction_confidence numeric default null,
  p_validation_issues jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_user uuid := (select auth.uid());
  v_resource_id uuid;
  v_course_id uuid;
  v_resource_type public.study_resource_type;
  v_topics integer := 0;
  v_skills integer := 0;
  v_questions integer := 0;
  v_issues jsonb := coalesce(p_validation_issues,'[]'::jsonb);
  v_topic jsonb;
  v_skill jsonb;
  v_question jsonb;
  v_topic_key text;
  v_skill_key text;
  v_topic_keys text[] := '{}'::text[];
  v_skill_keys text[] := '{}'::text[];
  v_existing_title text;
  v_kind text;
  v_dimension text;
  v_qtype text;
  v_origin text;
  v_question_count_for_skill integer;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then
    raise exception 'permanent account required';
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception 'candidate payload must be an object';
  end if;
  if jsonb_typeof(coalesce(p_payload->'topics','[]'::jsonb))<>'array' then
    raise exception 'topics must be an array';
  end if;
  if p_validation_issues is null or jsonb_typeof(p_validation_issues)<>'array' then
    raise exception 'validation_issues must be an array';
  end if;
  if p_extraction_confidence is not null and (p_extraction_confidence<0 or p_extraction_confidence>1) then
    raise exception 'extraction confidence out of range';
  end if;

  select ir.resource_id,ir.course_id,r.resource_type
  into v_resource_id,v_course_id,v_resource_type
  from public.study_ingestion_runs ir
  join public.study_resources r
    on r.user_id=ir.user_id and r.id=ir.resource_id
  where ir.id=p_run_id and ir.user_id=v_user and ir.status in ('queued','candidate')
  for update of ir;
  if not found then raise exception 'ingestion run not available'; end if;

  v_topics := jsonb_array_length(coalesce(p_payload->'topics','[]'::jsonb));

  select count(*)::int into v_skills
  from jsonb_array_elements(coalesce(p_payload->'topics','[]'::jsonb)) t,
       jsonb_array_elements(coalesce(t->'skills','[]'::jsonb)) s;

  select count(*)::int into v_questions
  from jsonb_array_elements(coalesce(p_payload->'topics','[]'::jsonb)) t,
       jsonb_array_elements(coalesce(t->'skills','[]'::jsonb)) s,
       jsonb_array_elements(coalesce(s->'questions','[]'::jsonb)) q;

  if v_topics>30 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code','too_many_topics','severity','error','message','Candidate exceeds the 30-topic hard limit.'
    ));
  elsif v_topics>12 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code','topic_explosion','severity','warning',
      'message','This source produced unusually many topics. Prefer reusable topics with atomic skills beneath them.'
    ));
  end if;

  if v_skills>120 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code','too_many_skills','severity','error','message','Candidate exceeds the 120-skill hard limit.'
    ));
  end if;

  if v_questions>400 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code','too_many_questions','severity','error','message','Candidate exceeds the 400-question hard limit.'
    ));
  elsif v_questions>80 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code','question_explosion','severity','warning',
      'message','This source generated more than 80 review questions. Keep only questions that add distinct evidence.'
    ));
  end if;

  if p_extraction_confidence is not null and p_extraction_confidence<0.65 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code','low_extraction_confidence',
      'severity',case when p_extraction_confidence<0.40 then 'error' else 'warning' end,
      'message','Overall extraction confidence is low.',
      'value',p_extraction_confidence
    ));
  end if;

  if v_topics=0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code','no_topics',
      'severity',case when v_resource_type in ('course_info','other') then 'warning' else 'error' end,
      'message','No study topics were extracted from this academic resource.'
    ));
  end if;

  if coalesce(p_payload->>'schema_version','') <> 'studyos-processing-v1' then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code','schema_version_missing','severity','warning',
      'message','Candidate does not declare studyos-processing-v1.'
    ));
  end if;

  for v_topic in
    select value from jsonb_array_elements(coalesce(p_payload->'topics','[]'::jsonb))
  loop
    v_topic_key := nullif(btrim(v_topic->>'stable_key'),'');
    if v_topic_key is null then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','missing_topic_key','severity','error','message','A topic is missing stable_key.'
      ));
    elsif v_topic_key !~ '^[a-z0-9][a-z0-9_:-]{1,119}$' then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','invalid_topic_key','severity','error',
        'message','Topic stable_key must be lowercase and machine-stable.','stable_key',v_topic_key
      ));
    elsif v_topic_key = any(v_topic_keys) then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','duplicate_topic_key','severity','error',
        'message','Topic stable_key appears more than once.','stable_key',v_topic_key
      ));
    else
      v_topic_keys := array_append(v_topic_keys,v_topic_key);
      select title into v_existing_title
      from public.study_topics
      where user_id=v_user and course_id=v_course_id and stable_key=v_topic_key;
      if v_existing_title is not null
         and v_existing_title is distinct from nullif(btrim(v_topic->>'title'),'') then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','topic_title_conflict','severity','warning',
          'message','Existing topic uses the same stable_key with a different title.',
          'stable_key',v_topic_key,'existing_title',v_existing_title,'candidate_title',v_topic->>'title'
        ));
      end if;
    end if;

    if nullif(btrim(v_topic->>'title'),'') is null then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','missing_topic_title','severity','error','message','A topic is missing title.','stable_key',v_topic_key
      ));
    end if;

    if jsonb_typeof(coalesce(v_topic->'skills','[]'::jsonb))<>'array' then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'code','invalid_skills_array','severity','error','message','Topic skills must be an array.','stable_key',v_topic_key
      ));
      continue;
    end if;

    for v_skill in
      select value from jsonb_array_elements(coalesce(v_topic->'skills','[]'::jsonb))
    loop
      v_skill_key := nullif(btrim(v_skill->>'stable_key'),'');
      if v_skill_key is null then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','missing_skill_key','severity','error','message','A skill is missing stable_key.'
        ));
      elsif v_skill_key !~ '^[a-z0-9][a-z0-9_:-]{1,159}$' then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','invalid_skill_key','severity','error',
          'message','Skill stable_key must be lowercase and machine-stable.','stable_key',v_skill_key
        ));
      elsif v_skill_key = any(v_skill_keys) then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','duplicate_skill_key','severity','error',
          'message','Skill stable_key must be unique inside one ingestion candidate.','stable_key',v_skill_key
        ));
      else
        v_skill_keys := array_append(v_skill_keys,v_skill_key);
        select title into v_existing_title
        from public.study_skills
        where user_id=v_user and course_id=v_course_id and stable_key=v_skill_key;
        if v_existing_title is not null
           and v_existing_title is distinct from nullif(btrim(v_skill->>'title'),'') then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','skill_title_conflict','severity','warning',
            'message','Existing skill uses the same stable_key with a different title.',
            'stable_key',v_skill_key,'existing_title',v_existing_title,'candidate_title',v_skill->>'title'
          ));
        end if;
      end if;

      if nullif(btrim(v_skill->>'title'),'') is null then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','missing_skill_title','severity','error','message','A skill is missing title.','stable_key',v_skill_key
        ));
      end if;

      v_kind := coalesce(nullif(v_skill->>'skill_kind',''),'other');
      if v_kind not in ('definition','theorem','proof','procedure','problem_solving','programming','graph','derivation','interpretation','other') then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','invalid_skill_kind','severity','error','message','Unsupported skill_kind.','skill_key',v_skill_key,'value',v_kind
        ));
      end if;

      if jsonb_typeof(coalesce(v_skill->'required_dimensions','[]'::jsonb))<>'array'
         or jsonb_array_length(coalesce(v_skill->'required_dimensions','[]'::jsonb))=0 then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','missing_required_dimensions','severity','error',
          'message','Every skill needs at least one required evidence dimension.','skill_key',v_skill_key
        ));
      else
        for v_dimension in
          select value from jsonb_array_elements_text(v_skill->'required_dimensions')
        loop
          if v_dimension not in ('recall','recognition','execution','transfer','exam') then
            v_issues := v_issues || jsonb_build_array(jsonb_build_object(
              'code','invalid_required_dimension','severity','error',
              'message','Unsupported required evidence dimension.','skill_key',v_skill_key,'value',v_dimension
            ));
          end if;
        end loop;
      end if;

      if not study_internal.candidate_has_anchor(v_skill->'source') then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','unanchored_skill','severity','error',
          'message','Every extracted skill must point to a source page or named section.','skill_key',v_skill_key
        ));
      end if;

      if jsonb_typeof(coalesce(v_skill->'questions','[]'::jsonb))<>'array' then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','invalid_questions_array','severity','error','message','Skill questions must be an array.','skill_key',v_skill_key
        ));
        continue;
      end if;

      v_question_count_for_skill := jsonb_array_length(coalesce(v_skill->'questions','[]'::jsonb));
      if v_question_count_for_skill=0 then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','skill_without_questions','severity','warning',
          'message','A skill has no candidate review question.','skill_key',v_skill_key
        ));
      elsif v_question_count_for_skill>12 then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','too_many_skill_questions','severity','error',
          'message','A single skill cannot contribute more than 12 questions.','skill_key',v_skill_key
        ));
      elsif v_question_count_for_skill>6 then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code','skill_question_redundancy','severity','warning',
          'message','A single skill has more than six questions; check for redundant variants.','skill_key',v_skill_key
        ));
      end if;

      for v_question in
        select value from jsonb_array_elements(coalesce(v_skill->'questions','[]'::jsonb))
      loop
        if nullif(btrim(v_question->>'prompt'),'') is null then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','missing_question_prompt','severity','error',
            'message','A candidate question has no prompt.','skill_key',v_skill_key
          ));
        end if;

        if nullif(btrim(v_question->>'answer_key_or_rubric'),'') is null then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','missing_answer_rubric','severity','error',
            'message','Every candidate question needs an answer key or grading rubric.','skill_key',v_skill_key
          ));
        end if;

        if not study_internal.candidate_has_anchor(v_question->'source') then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','unanchored_question','severity','error',
            'message','Every candidate question must point to a source page or named section.','skill_key',v_skill_key
          ));
        end if;

        v_qtype := coalesce(nullif(v_question->>'question_type',''),'problem');
        if v_qtype not in ('recall','recognition','short_application','proof_skeleton','problem','exam_problem','trace','implement','debug','complexity','graph','derivation','interpretation') then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','invalid_question_type','severity','error','message','Unsupported question_type.','skill_key',v_skill_key,'value',v_qtype
          ));
        end if;

        v_dimension := coalesce(nullif(v_question->>'evidence_dimension',''),'execution');
        if v_dimension not in ('recall','recognition','execution','transfer','exam') then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','invalid_question_dimension','severity','error','message','Unsupported evidence_dimension.','skill_key',v_skill_key,'value',v_dimension
          ));
        end if;

        v_origin := coalesce(nullif(v_question->>'origin',''),'generated');
        if v_origin not in ('official','generated','manual') then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','invalid_question_origin','severity','error','message','Unsupported question origin.','skill_key',v_skill_key,'value',v_origin
          ));
        end if;

        if (v_question->>'expected_minutes') is not null
           and (
             (v_question->>'expected_minutes') !~ '^[0-9]+([.][0-9]+)?$'
             or (v_question->>'expected_minutes')::numeric < 0.25
             or (v_question->>'expected_minutes')::numeric > 120
           ) then
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'code','invalid_expected_minutes','severity','error',
            'message','Question expected_minutes must be between 0.25 and 120.','skill_key',v_skill_key
          ));
        end if;
      end loop;
    end loop;
  end loop;

  update public.study_ingestion_runs
  set status='candidate',
      candidate_payload=p_payload,
      validation_issues=v_issues,
      processor=left(p_processor,120),
      processor_version=left(p_processor_version,120),
      candidate_at=now(),
      failure_detail=null
  where id=p_run_id and user_id=v_user;

  update public.study_resources
  set processing_status='needs_review'::public.study_processing_status,
      extraction_confidence=p_extraction_confidence,
      processed_at=now()
  where id=v_resource_id and user_id=v_user;

  return jsonb_build_object(
    'ingestion_run_id',p_run_id,
    'resource_id',v_resource_id,
    'status','candidate',
    'topics',v_topics,
    'skills',v_skills,
    'questions',v_questions,
    'validation_issues',v_issues,
    'blocking_issues',(
      select count(*) from jsonb_array_elements(v_issues) i
      where i->>'severity'='error'
    )
  );
end;
$$;

revoke all on function public.study_submit_ingestion_candidate(uuid,jsonb,text,text,numeric,jsonb)
from public,anon;
grant execute on function public.study_submit_ingestion_candidate(uuid,jsonb,text,text,numeric,jsonb)
to authenticated;

create or replace function public.study_accept_ingestion_run(p_run_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_user uuid := (select auth.uid());
  v_run public.study_ingestion_runs%rowtype;
  v_topic jsonb;
  v_skill jsonb;
  v_question jsonb;
  v_topic_id uuid;
  v_skill_id uuid;
  v_question_id uuid;
  v_topic_key text;
  v_skill_key text;
  v_dims public.study_evidence_dimension[];
  v_created_topics integer := 0;
  v_created_skills integer := 0;
  v_created_questions integer := 0;
  v_retired_questions integer := 0;
  v_drive_file_id text;
  v_origin public.study_question_origin;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if coalesce((select auth.jwt()->>'is_anonymous'),'false')='true' then
    raise exception 'permanent account required';
  end if;

  select * into v_run
  from public.study_ingestion_runs
  where id=p_run_id and user_id=v_user
  for update;

  if not found then raise exception 'ingestion run not found'; end if;
  if v_run.status <> 'candidate' then raise exception 'ingestion run is not awaiting acceptance'; end if;
  if v_run.candidate_payload is null then raise exception 'candidate payload missing'; end if;

  if exists(
    select 1 from jsonb_array_elements(coalesce(v_run.validation_issues,'[]'::jsonb)) i
    where i->>'severity'='error'
  ) then
    raise exception 'candidate has blocking validation issues';
  end if;

  with retired as (
    update public.study_questions q
    set active=false,updated_at=now()
    where q.user_id=v_user
      and q.active
      and q.origin in ('official','generated')
      and exists(
        select 1 from public.study_question_sources qs
        where qs.user_id=v_user
          and qs.question_id=q.id
          and qs.resource_id=v_run.resource_id
      )
    returning q.id
  )
  select count(*)::int into v_retired_questions from retired;

  delete from public.study_resource_skills
  where user_id=v_user and resource_id=v_run.resource_id;

  for v_topic in
    select value from jsonb_array_elements(coalesce(v_run.candidate_payload->'topics','[]'::jsonb))
  loop
    v_topic_key := nullif(btrim(v_topic->>'stable_key'),'');
    if v_topic_key is null then raise exception 'topic stable_key required'; end if;
    if nullif(btrim(v_topic->>'title'),'') is null then raise exception 'topic title required'; end if;

    select id into v_topic_id
    from public.study_topics
    where user_id=v_user and course_id=v_run.course_id and stable_key=v_topic_key;

    if v_topic_id is null then
      insert into public.study_topics(
        user_id,course_id,stable_key,title,description,first_week_no
      )
      values(
        v_user,v_run.course_id,v_topic_key,btrim(v_topic->>'title'),
        nullif(v_topic->>'description',''),
        case when (v_topic->>'first_week_no') ~ '^[0-9]+$'
             then (v_topic->>'first_week_no')::smallint else null end
      )
      returning id into v_topic_id;
      v_created_topics := v_created_topics+1;
    end if;

    for v_skill in
      select value from jsonb_array_elements(coalesce(v_topic->'skills','[]'::jsonb))
    loop
      v_skill_key := nullif(btrim(v_skill->>'stable_key'),'');
      if v_skill_key is null then raise exception 'skill stable_key required'; end if;
      if nullif(btrim(v_skill->>'title'),'') is null then raise exception 'skill title required'; end if;
      if not study_internal.candidate_has_anchor(v_skill->'source') then
        raise exception 'skill source anchor required';
      end if;

      select array_agg(x::public.study_evidence_dimension)
      into v_dims
      from jsonb_array_elements_text(v_skill->'required_dimensions') x;

      if cardinality(v_dims)=0 then raise exception 'required dimensions missing'; end if;

      select id into v_skill_id
      from public.study_skills
      where user_id=v_user and course_id=v_run.course_id and stable_key=v_skill_key;

      if v_skill_id is null then
        insert into public.study_skills(
          user_id,course_id,stable_key,title,description,skill_kind,
          required_dimensions,exam_importance,prerequisite_importance
        )
        values(
          v_user,v_run.course_id,v_skill_key,btrim(v_skill->>'title'),
          nullif(v_skill->>'description',''),
          coalesce(nullif(v_skill->>'skill_kind',''),'other')::public.study_skill_kind,
          v_dims,
          greatest(1,least(5,coalesce(nullif(v_skill->>'exam_importance','')::smallint,3))),
          greatest(1,least(5,coalesce(nullif(v_skill->>'prerequisite_importance','')::smallint,3)))
        )
        returning id into v_skill_id;
        v_created_skills := v_created_skills+1;
      end if;

      insert into public.study_topic_skills(user_id,topic_id,skill_id,is_primary)
      values(v_user,v_topic_id,v_skill_id,true)
      on conflict(topic_id,skill_id) do update set is_primary=true;

      insert into public.study_resource_skills(
        user_id,resource_id,skill_id,relation_type,page_start,page_end,section_label,confidence
      )
      values(
        v_user,v_run.resource_id,v_skill_id,
        coalesce(nullif(v_skill#>>'{source,relation_type}',''),'introduces'),
        case when (v_skill#>>'{source,page_start}') ~ '^[0-9]+$'
             then (v_skill#>>'{source,page_start}')::integer else null end,
        case when (v_skill#>>'{source,page_end}') ~ '^[0-9]+$'
             then (v_skill#>>'{source,page_end}')::integer else null end,
        nullif(v_skill#>>'{source,section_label}',''),
        case when (v_skill#>>'{source,confidence}') ~ '^([01]([.][0-9]+)?|0?[.][0-9]+)$'
             then greatest(0,least(1,(v_skill#>>'{source,confidence}')::numeric)) else null end
      );

      for v_question in
        select value from jsonb_array_elements(coalesce(v_skill->'questions','[]'::jsonb))
      loop
        if nullif(btrim(v_question->>'prompt'),'') is null then raise exception 'question prompt required'; end if;
        if nullif(btrim(v_question->>'answer_key_or_rubric'),'') is null then raise exception 'answer rubric required'; end if;
        if not study_internal.candidate_has_anchor(v_question->'source') then raise exception 'question source anchor required'; end if;

        v_origin := coalesce(nullif(v_question->>'origin',''),'generated')::public.study_question_origin;

        insert into public.study_questions(
          user_id,course_id,primary_skill_id,question_type,evidence_dimension,
          prompt,answer_key_or_rubric,hint_1,hint_2,difficulty,expected_minutes,
          source_confidence,origin,active,ingestion_run_id
        )
        values(
          v_user,v_run.course_id,v_skill_id,
          coalesce(nullif(v_question->>'question_type',''),'problem')::public.study_question_type,
          coalesce(nullif(v_question->>'evidence_dimension',''),'execution')::public.study_evidence_dimension,
          btrim(v_question->>'prompt'),
          btrim(v_question->>'answer_key_or_rubric'),
          nullif(v_question->>'hint_1',''),
          nullif(v_question->>'hint_2',''),
          greatest(1,least(5,coalesce(nullif(v_question->>'difficulty','')::smallint,3))),
          greatest(0.25,least(120,coalesce(nullif(v_question->>'expected_minutes','')::numeric,3))),
          case when (v_question->>'source_confidence') ~ '^([01]([.][0-9]+)?|0?[.][0-9]+)$'
               then greatest(0,least(1,(v_question->>'source_confidence')::numeric)) else null end,
          v_origin,
          true,
          v_run.id
        )
        returning id into v_question_id;

        insert into public.study_question_sources(
          user_id,question_id,resource_id,page_start,page_end,section_label,source_role
        )
        values(
          v_user,v_question_id,v_run.resource_id,
          case when (v_question#>>'{source,page_start}') ~ '^[0-9]+$'
               then (v_question#>>'{source,page_start}')::integer else null end,
          case when (v_question#>>'{source,page_end}') ~ '^[0-9]+$'
               then (v_question#>>'{source,page_end}')::integer else null end,
          nullif(v_question#>>'{source,section_label}',''),
          coalesce(nullif(v_question#>>'{source,source_role}',''),'basis')
        );

        v_created_questions := v_created_questions+1;
      end loop;
    end loop;
  end loop;

  update public.study_ingestion_runs
  set status='accepted',decided_at=now()
  where id=v_run.id and user_id=v_user;

  update public.study_resources
  set processing_status='verified'::public.study_processing_status,
      processed_at=now()
  where id=v_run.resource_id and user_id=v_user
  returning drive_file_id into v_drive_file_id;

  update public.study_intake_items
  set status='registered',
      resource_id=v_run.resource_id,
      ingestion_run_id=v_run.id,
      processed_at=now(),
      last_seen_at=now()
  where user_id=v_user and drive_file_id=v_drive_file_id;

  return jsonb_build_object(
    'ingestion_run_id',v_run.id,
    'resource_id',v_run.resource_id,
    'status','accepted',
    'created_topics',v_created_topics,
    'created_skills',v_created_skills,
    'created_questions',v_created_questions,
    'retired_previous_questions',v_retired_questions
  );
end;
$$;

revoke all on function public.study_accept_ingestion_run(uuid) from public,anon;
grant execute on function public.study_accept_ingestion_run(uuid) to authenticated;
