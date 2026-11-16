// Supabase edge function (Deno): talking with 보리 through 정균's 1번 LLM, ported to TypeScript (app/core/llm1).
// One conversation, one profile and one detection store per player, kept in llm1_docs (db/migrations/004, 005); the
// model is asked with Structured Outputs (strict JSON schema, daily or elicitation) and every answer is checked by the
// engine before anything is saved.
// actions:
//   message {text, client_message_id?}  a line from the player (daily talk, or the stop-loss talk while one is open)
//   visit   {}                          보리 may speak first, once a visit
//   open    {signals:[company_id]}      stop-loss signals on holdings → 보리 opens the talk about the oldest one
//   pause   {} · resume {}              hold or pick up the stop-loss talk
//   profile {} · forget {path}
// The app sends the player's holdings ({company_id, name}) with each call: they are what company paths may name.
// After each turn ready packets go to analysis_inbox; only a matching stored hash counts as received (then the raw
// quotes are dropped from llm1_docs).
// Build: node tools/build-functions.mjs bori-talk → db/functions/bori-talk/bundle.js. Secrets: OPENAI_API_KEY,
// optional OPENAI_MODEL (default gpt-6-luna, core/llmModel.ts). SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are given.
// deno-lint-ignore-file no-explicit-any
import {runTurn,newStore,openSession,newProfile,startVisit,receiveStopLossSignal,startNextPendingDetection,pauseElicitation,resumeElicitation,runDeliveryWorker,
  type Conv,type ProfileDoc,type World,type Holding,type Store,type Mode,type Receiver,type TurnResult} from '../../../app/core/llm1/engine';
import {DAILY_SCHEMA,ELICITATION_SCHEMA} from '../../../app/core/llm1/prompt';
import {FieldRegistry} from '../../../app/core/llm1/registry';
import {forgetPath} from '../../../app/core/llm1/profile';
import {chatBody,LLM_DEFAULT} from '../../../app/core/llmModel';
import {LLM_LIMIT} from '../../../app/core/jigi/llm';
import persona from '../../../app/content/llm1/persona_bori.json';
import registry from '../../../app/content/llm1/field_registry.json';
import userTemplate from '../../../app/content/llm1/user_profile_template.json';
import strategyTemplate from '../../../app/content/llm1/strategy_template.json';
import examples from '../../../app/content/llm1/philosophy_examples.json';
declare const Deno:any;
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'POST only'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),openai=Deno.env.get('OPENAI_API_KEY');
  const me=await (await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:req.headers.get('authorization')??''}})).json().catch(()=>null);
  if(!me?.id)return json({error:'sign-in'},401);
  const b=await req.json().catch(()=>({})) as {action?:string;text?:string;client_message_id?:string;path?:string;holdings?:Holding[];signals?:string[]};
  const svc={apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'};
  const load=async(coll:string)=>{const r=await fetch(`${url}/rest/v1/llm1_docs?player_id=eq.${me.id}&coll=eq.${coll}&select=doc`,{headers:svc});const a=r.ok?await r.json():[];return a[0]?.doc??null};
  const save=(coll:string,doc:unknown)=>fetch(`${url}/rest/v1/llm1_docs?on_conflict=player_id,coll`,{method:'POST',headers:{...svc,prefer:'resolution=merge-duplicates'},body:JSON.stringify({player_id:me.id,coll,doc,updated_at:new Date().toISOString()})});
  const now=Date.now();
  let profile=(await load('profile')) as ProfileDoc|null??newProfile(me.id,structuredClone(userTemplate) as any);
  if(b.action==='profile')return json({profile:profile.json});
  if(b.action==='forget'){try{const reg=new FieldRegistry(registry as any,()=>Object.keys((profile!.json.company_views as object)??{}));
    const j=forgetPath(profile.json,reg,String(b.path));profile={...profile,json:j,revision:j.revision as number};await save('profile',profile);return json({ok:true})}
    catch(e){return json({error:(e as Error).message},400)}}
  if(!openai)return json({error:'no-llm'},503);
  let conv=(await load('conversation')) as Conv|null;
  if(!conv||conv.persona_version!==(persona as any).persona_version)conv=openSession(me.id,persona as any,now);
  const det=(await load('detection')) as Pick<Store,'events'|'sessions'|'jobs'>|null;
  let store:Store={...newStore(me.id,persona as any,userTemplate as any,now),conv,profile,...(det??{})};
  const holdings=(Array.isArray(b.holdings)?b.holdings:[]).filter(h=>h&&typeof h.company_id==='string').slice(0,30).map(h=>({company_id:h.company_id.slice(0,20),name:String(h.name??'').slice(0,40)||null,status:'holding'}));
  const world:World={persona:persona as any,registry:registry as any,strategyTemplate:strategyTemplate as any,userTemplate:userTemplate as any,examples:(examples as any).examples,holdings,news:[],now:()=>Date.now()};
  const persist=async(s:Store)=>{await save('conversation',s.conv);if(s.profile!==profile)await save('profile',s.profile);await save('detection',{events:s.events,sessions:s.sessions,jobs:s.jobs})};
  const status=(s:Store)=>{const es=s.sessions.find(x=>x.elicitation_id===s.conv.active_elicitation_id);return es?{status:es.status,company_id:es.company_id}:null};
  if(b.action==='pause'){store=pauseElicitation(store,'user_request');await persist(store);return json({detection:status(store)})}
  if(!['message','visit','open','resume'].includes(b.action??''))return json({error:'bad-request'},400);
  if(b.action==='message'&&(typeof b.text!=='string'||!b.text.trim()))return json({error:'bad-request'},400);
  if(b.action==='open'){
    const signals=(Array.isArray(b.signals)?b.signals:[]).filter(x=>typeof x==='string').slice(0,10);
    store=receiveStopLossSignal(store,world,signals,{sourceModel:'rethink_mock_signals'}).store;
    const es=store.sessions.find(x=>x.elicitation_id===store.conv.active_elicitation_id);
    // a talk already under way (or nothing queued): no new call, the app keeps its own opener
    if(es||!(store.conv.pending_detection_events??[]).length){await persist(store);return json({reply:null,detection:status(store)})}
  }
  // a day's AI calls, shared with the other functions
  const day=new Date(now+9*3600e3).toISOString().slice(0,10);
  const take=await fetch(`${url}/rest/v1/rpc/llm_take`,{method:'POST',headers:svc,body:JSON.stringify({p:me.id,d:day,cap:LLM_LIMIT.perDay})});
  if(!take.ok||!(await take.json()))return json({reply:b.action==='message'?{text:'오늘은 수다 많이 떨었다! 내일 또 얘기하자.',emotion:'tired'}:null,limit:true});
  const model=async(messages:unknown[],mode:Mode)=>{
    const body={...chatBody(Deno.env.get('OPENAI_MODEL')??LLM_DEFAULT,messages,{out:mode==='elicitation'?900:700,temperature:0.7}),
      response_format:{type:'json_schema',json_schema:mode==='elicitation'?ELICITATION_SCHEMA:DAILY_SCHEMA}};
    const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${openai}`,'content-type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error(`openai ${r.status}`);return (await r.json())?.choices?.[0]?.message?.content??''};
  let result:TurnResult|null=null;
  if(b.action==='open'){const r=await startNextPendingDetection(store,world,model);if(r){store=r.store;result=r.result}}
  else if(b.action==='resume'){const r=await resumeElicitation(store,world,model);store=r.store;result=r.result}
  else{if(b.action==='visit')store={...store,conv:startVisit(store.conv)};
    const r=await runTurn(store,world,model,{text:b.action==='message'?b.text!.slice(0,2000):null,spontaneous:b.action==='visit',clientMessageId:b.client_message_id??null});
    store=r.store;result=r.result}
  // hand ready packets to the analysis inbox (receiver: insert once, then compare the stored hash)
  const receive:Receiver=async job=>{
    await fetch(`${url}/rest/v1/analysis_inbox?on_conflict=request_id`,{method:'POST',headers:{...svc,prefer:'resolution=ignore-duplicates'},
      body:JSON.stringify({request_id:job.request_id,player_id:me.id,payload_hash:job.payload_hash,route:job.route,payload:job.payload})});
    const r=await fetch(`${url}/rest/v1/analysis_inbox?request_id=eq.${encodeURIComponent(job.request_id)}&player_id=eq.${me.id}&select=payload_hash`,{headers:svc});
    const row=r.ok?(await r.json())[0]:null;if(!row)throw new Error('inbox write failed');
    return {request_id:job.request_id,payload_hash:row.payload_hash,status:row.payload_hash===job.payload_hash?'persisted':'conflict'}};
  if(store.jobs.some(j=>j.status==='ready'||j.status==='queued'))store=(await runDeliveryWorker(store,receive,Date.now())).store;
  await persist(store);
  return json({reply:result?.reply??null,learned:result?.profile_applied.length??0,detection:status(store)});
});
