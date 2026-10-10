// Loopback-only Supabase protocol double for the actual production application.
// Never imported by application code; no real provider credentials or records.
import {createServer} from 'node:http';
import {createHmac,randomUUID} from 'node:crypto';
export const owner='99999999-9999-4999-8999-999999999999';
export const courseId='11111111-1111-4111-8111-111111111111';
export const semesterId='55555555-5555-4555-8555-555555555555';
const weekId='66666666-6666-4666-8666-666666666666';
const skillId='77777777-7777-4777-8777-777777777777';
const questionId='33333333-3333-4333-8333-333333333333';
export function sessionFor(userId=owner){
 const now=Math.floor(Date.now()/1000),exp=now+3600;
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const head=encode({alg:'HS256',typ:'JWT'}),body=encode({sub:userId,aud:'authenticated',role:'authenticated',iat:now,exp,is_anonymous:false});
 const token=head+'.'+body+'.'+createHmac('sha256','isolated-test-only').update(head+'.'+body).digest('base64url');
 return {access_token:token,refresh_token:'isolated-only',expires_at:exp,expires_in:3600,token_type:'bearer',user:{id:userId,aud:'authenticated',role:'authenticated',email:'student@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-10-10T00:00:00Z'}};
}
export function seededState(){
 const semester={id:semesterId,user_id:owner,stable_key:'winter_2026',display_name:'Winter semester 2026',starts_on:'2026-10-05',ends_on:'2027-03-31',timezone:'Europe/Berlin',active:true,bootstrap_certified_at:'2026-10-10T00:00:00Z',review_daily_budget_minutes:40};
 const course={id:courseId,course_id:courseId,semester_id:semesterId,user_id:owner,display_name:'Differentialgleichungen',stable_key:'differentialgleichungen',short_name:'DGL',sort_order:1,course_kind:'major',active:true,credits:6,exam_at:null,professor:null,drive_folder_url:null,expects_exercise:true,expects_solution:true,expected_lectures_per_week:1};
 const week={id:weekId,teaching_week_id:weekId,course_id:courseId,semester_id:semesterId,week_no:1,resource_count:3,lecture_count:1,exercise_count:1,solution_count:1,verified_resources:1,pending_resources:2,candidate_runs:0,skill_count:1,new_skills:1,learning_skills:0,fragile_skills:0,stable_skills:0,exam_ready_skills:0,due_skills:1,due_minutes:5,unresolved_errors:0,health_status:'learning',next_action:'retrieve_lecture',open_findings:0,scheduled_repairs:0,lecture_retrieval_due:true,exercise_attempt_due:false,solution_reconcile_due:false,checkpoint_due:false,lecture_retrieval_completed_at:null,exercise_attempt_completed_at:null,solution_reconciled_at:null,checkpoint_completed_at:null};
 const resources=['lecture','exercise','solution'].map((type,i)=>({id:`88888888-8888-4888-8888-88888888888${i}`,user_id:owner,course_id:courseId,teaching_week_id:weekId,title:`Week 1 · ${type==='lecture'?'Lecture':type==='exercise'?'Exercise sheet':'Official solution'}.pdf`,resource_type:type,processing_status:i===0?'verified':'new',source_authority:'official_course',drive_url:`https://drive.google.com/file/d/isolated-${type}/view`,active:true,created_at:'2026-10-10T10:00:00Z',content_sha256:null,published_at:null}));
 const skill={id:skillId,skill_id:skillId,course_id:courseId,semester_id:semesterId,title:'Differentiation',skill_title:'Differentiation',stable_key:'differentiation',active:true,first_week_no:1,is_due:true,priority_score:80,expected_minutes:5,target_dimension:'execution',state:'learning',mastery_level:'learning',prerequisite_importance:3};
 const question={id:questionId,course_id:courseId,primary_skill_id:skillId,active:true,question_type:'problem',evidence_dimension:'execution',prompt:'Find the derivative of \\(x^2\\).',expected_minutes:5,difficulty:1,answer_key_or_rubric:'2x',hint_1:null,hint_2:null};
 return {semester,courses:[course],weeks:[week],resources,skills:[skill],questions:[question],attempts:[],sessions:[],rejectWrites:false,requests:[]};
}
export async function startProvider(port=3199){
 let state=seededState();
 const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:'+port);let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};
  const send=(data,status=200)=>{res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','content-range':`0-0/${Array.isArray(data)?data.length:1}`});res.end(JSON.stringify(data));};
  if(req.method==='OPTIONS')return send(null);
  const token=(req.headers.authorization??'').replace('Bearer ','');let userId;
  try{const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));if(claims.exp>Date.now()/1000&&token===sessionFor(claims.sub).access_token)userId=claims.sub;
   // Tokens remain valid across the clock tick; verify the same fixed synthetic signature.
   const [h,b,s]=token.split('.');if(claims.exp>Date.now()/1000&&createHmac('sha256','isolated-test-only').update(h+'.'+b).digest('base64url')===s)userId=claims.sub;
  }catch{}
  if(url.pathname==='/auth/v1/user')return userId?send({...sessionFor(userId).user}):send({message:'Expired or invalid isolated session'},401);
  if(!userId)return send({message:'Authentication required'},401);
  if(url.pathname.startsWith('/rest/v1/')){
   const table=url.pathname.slice('/rest/v1/'.length);state.requests.push({table,method:req.method,query:url.search});
   if(table.startsWith('rpc/')){
    if(state.rejectWrites)return send({message:'Synthetic write rejected',code:'42501'},403);
    const rpc=table.slice(4);if(rpc==='connect_thiepn_app')return send({ok:true});
    if(rpc==='study_create_initial_semester'){state.semester={...seededState().semester,user_id:userId,stable_key:body.p_stable_key,display_name:body.p_display_name,starts_on:body.p_starts_on,ends_on:body.p_ends_on,timezone:body.p_timezone};return send({semesterId});}
    if(rpc==='study_register_resource'){if(!state.courses.some(c=>c.id===body.p_course_id&&c.user_id===userId))return send({code:'42501',message:'Owner mismatch'},403);const item={...seededState().resources[0],id:randomUUID(),title:body.p_title,resource_type:body.p_resource_type,drive_url:body.p_drive_url,processing_status:'new'};state.resources.push(item);return send({resource_id:item.id});}
    if(rpc==='study_create_course'){state.courses.push({...seededState().courses[0],user_id:userId,id:courseId,course_id:courseId,display_name:body.p_display_name,stable_key:body.p_stable_key});return send({course_id:courseId});}
    if(rpc==='study_start_study_session'){state.sessions.push({id:body.p_session_id,user_id:userId,course_id:body.p_course_id,session_type:body.p_session_type,started_at:body.p_started_at,ended_at:null});return send(body.p_session_id);}
    if(rpc==='study_finish_review_session'){const session=state.sessions.find(s=>s.id===body.p_session_id&&s.user_id===userId);if(!session)return send({code:'42501',message:'No owned session'},403);session.ended_at=body.p_ended_at;return send(session.id);}
    if(rpc==='study_record_attempt_v3'){if(userId!==owner||body.p_question_id!==questionId)return send({code:'42501',message:'Owner mismatch'},403);state.attempts.push({id:body.p_request_id,user_id:userId,course_id:courseId,question_id:questionId,skill_id:skillId,result:body.p_result,independence:body.p_independence,completed_at:body.p_completed_at,session_id:body.p_session_id});return send(body.p_request_id);}
    return send({code:'PGRST202',message:'RPC not modeled: '+rpc},400);
   }
   let rows=[];
   if(state.semester?.user_id===userId){
    const courseRows=state.courses.filter(c=>c.user_id===userId);
    const mapping={study_semesters:[state.semester],study_courses:courseRows,study_course_configuration:courseRows,study_course_progress:courseRows.map(c=>({...c,total_skills:1,unverified_resources:2})),study_week_actions:state.weeks,study_weekly_health:state.weeks,study_teaching_weeks:state.weeks,study_resources:state.resources,study_skills:state.skills,study_due_skills:state.skills,study_skill_retention_diagnostics:state.skills,study_questions:state.questions,study_attempts:state.attempts,study_sessions:state.sessions,study_course_operating_mode:courseRows.map(c=>({...c,operating_mode:'semester',days_to_exam:null})),study_commitments:[{id:'deadline',course_id:courseId,semester_id:semesterId,title:'Exercise sheet 1',due_at:'2026-10-14T12:00:00Z',status:'open',kind:'assignment',priority:3,estimated_minutes:30}],study_current_capacity:[{user_id:userId,semester_id:semesterId,local_today:'2026-10-10',timezone:'Europe/Berlin',mode:'normal',total_budget_minutes:120,effective_review_budget_minutes:40,effective_max_focus_items:4,review_daily_budget_minutes:40}],study_planning_settings:[{semester_id:semesterId,default_mode:'normal'}]};
    mapping.study_course_risk=courseRows.map(c=>({...c,course_id:c.id,total_skills:1,tested_skills:state.attempts.some(a=>a.course_id===c.id)?1:0,due_or_at_risk_skills:1,overdue_7d_skills:0,relearning_skills:0,recent_lapse_skills:0,avg_retention_pressure:0,independent_success_percent_28d:null,actionable_backlog:0,unresolved_errors:0,operating_mode:'semester',days_to_exam:null,exam_ready_percent:0,risk_score:0,risk_band:'healthy',risk_components:{},recommended_mix:{}}));
    mapping.study_activation_course_status=courseRows.map(c=>({...c,course_id:c.id,drive_folder_ready:false,exam_date_configured:false,timetable_event_count:0,resource_count:state.resources.filter(r=>r.course_id===c.id).length,week1_resource_count:0,week1_verified_resource_count:0,topic_count:0,skill_count:1,question_count:1,attempt_count:state.attempts.filter(a=>a.course_id===c.id).length,baseline_status:'not_started',baseline_classified_count:0,baseline_skill_count:1}));
    rows=mapping[table]??[];
   }
   for(const [key,value] of url.searchParams){if(['select','order','limit','offset','or'].includes(key))continue;if(value.startsWith('eq.'))rows=rows.filter(r=>String(r[key])===value.slice(3));if(value.startsWith('in.('))rows=rows.filter(r=>value.slice(4,-1).split(',').includes(String(r[key])));}
   if(req.method==='HEAD'){res.writeHead(200,{'content-range':`0-0/${rows.length}`});return res.end();}
   const single=String(req.headers.accept).includes('vnd.pgrst.object');return send(single?(rows[0]??null):rows);
  }
  send({message:'Not modeled'},404);
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return {server,get state(){return state;},reset({empty=false}={}){state=seededState();if(empty){state.semester=null;state.courses=[];}},close:()=>new Promise(resolve=>server.close(resolve))};
}
