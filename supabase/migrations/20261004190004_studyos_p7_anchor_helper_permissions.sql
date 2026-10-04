create or replace function public.study_candidate_has_anchor(p_source jsonb)
returns boolean
language sql
immutable
set search_path=''
as $$
  select
    p_source is not null
    and jsonb_typeof(p_source)='object'
    and (
      nullif(btrim(p_source->>'section_label'),'') is not null
      or (p_source->>'page_start') ~ '^[0-9]+$'
      or (p_source->>'page_end') ~ '^[0-9]+$'
    );
$$;

revoke all on function public.study_candidate_has_anchor(jsonb) from public,anon;
grant execute on function public.study_candidate_has_anchor(jsonb) to authenticated;

do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.study_submit_ingestion_candidate(uuid,jsonb,text,text,numeric,jsonb)'::regprocedure)
  into v_def;
  v_def := replace(v_def,'study_internal.candidate_has_anchor','public.study_candidate_has_anchor');
  execute v_def;

  select pg_get_functiondef('public.study_accept_ingestion_run(uuid)'::regprocedure)
  into v_def;
  v_def := replace(v_def,'study_internal.candidate_has_anchor','public.study_candidate_has_anchor');
  execute v_def;
end $$;

revoke all on function public.study_submit_ingestion_candidate(uuid,jsonb,text,text,numeric,jsonb) from public,anon;
grant execute on function public.study_submit_ingestion_candidate(uuid,jsonb,text,text,numeric,jsonb) to authenticated;

revoke all on function public.study_accept_ingestion_run(uuid) from public,anon;
grant execute on function public.study_accept_ingestion_run(uuid) to authenticated;
