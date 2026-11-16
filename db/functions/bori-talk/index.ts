// Supabase edge function (Deno): talking with 보리 through 정균's 1번 LLM, ported to TypeScript (app/core/llm1).
// One conversation and one profile per player, kept in llm1_docs (db/migrations/004_llm1.sql); the model is asked with
// Structured Outputs (strict JSON schema) and every answer is checked by the engine before anything is saved.
// actions: message {text, client_message_id?} · visit {} (보리 may speak first, once a visit) · profile {} · forget {path}
// The app sends the player's holdings ({company_id, name}) with each call: they are what company paths may name.
// Build: node tools/build-functions.mjs bori-talk → db/functions/bori-talk/bundle.js. Secrets: OPENAI_API_KEY,
// optional OPENAI_MODEL (default gpt-6-luna, core/llmModel.ts). SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are given.
// deno-lint-ignore-file no-explicit-any
import {runTurn,openSession,newProfile,startVisit,type Conv,type ProfileDoc,type World,type Holding} from '../../../app/core/llm1/engine';
import {DAILY_SCHEMA} from '../../../app/core/llm1/prompt';
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
  const b=await req.json().catch(()=>({})) as {action?:string;text?:string;client_message_id?:string;path?:string;holdings?:Holding[]};
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
  const holdings=(Array.isArray(b.holdings)?b.holdings:[]).filter(h=>h&&typeof h.company_id==='string').slice(0,30).map(h=>({company_id:h.company_id.slice(0,20),name:String(h.name??'').slice(0,40)||null}));
  const world:World={persona:persona as any,registry:registry as any,strategyTemplate:strategyTemplate as any,userTemplate:userTemplate as any,examples:(examples as any).examples,holdings,news:[],now:()=>Date.now()};
  if(b.action==='visit')conv=startVisit(conv);
  else if(b.action!=='message'||typeof b.text!=='string'||!b.text.trim())return json({error:'bad-request'},400);
  // a day's AI calls, shared with the other functions
  const day=new Date(now+9*3600e3).toISOString().slice(0,10);
  const take=await fetch(`${url}/rest/v1/rpc/llm_take`,{method:'POST',headers:svc,body:JSON.stringify({p:me.id,d:day,cap:LLM_LIMIT.perDay})});
  if(!take.ok||!(await take.json()))return json({reply:{text:'오늘은 수다 많이 떨었다! 내일 또 얘기하자.',emotion:'tired'},limit:true});
  const model=async(messages:unknown[])=>{
    const body={...chatBody(Deno.env.get('OPENAI_MODEL')??LLM_DEFAULT,messages,{out:700,temperature:0.7}),response_format:{type:'json_schema',json_schema:DAILY_SCHEMA}};
    const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${openai}`,'content-type':'application/json'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error(`openai ${r.status}`);return (await r.json())?.choices?.[0]?.message?.content??''};
  const out=await runTurn(conv,profile,world,model,{text:b.action==='message'?b.text!.slice(0,2000):null,spontaneous:b.action==='visit',clientMessageId:b.client_message_id??null});
  await save('conversation',out.conv);if(out.profile!==profile)await save('profile',out.profile);
  return json({reply:out.result.reply,learned:out.result.profile_applied.length});
});
