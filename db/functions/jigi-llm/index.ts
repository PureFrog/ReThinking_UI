// Supabase edge function (Deno): the 지기 LLM calls (app/core/jigi/llm.ts) — mode "extract" (A 가설 구조화),
// "assist" (B 작성 도움), "explain" (C 분석 설명). The player's own sign-in names them; each player gets
// LLM_LIMIT.perDay calls a day (llm_take in db/migrations/003_jigi.sql). Whatever comes back is checked by the app's
// own rules before it is returned; if it fails, the reply is {fallback:true} and the app keeps its rule-based text.
// Build one pasteable file: node tools/build-functions.mjs jigi-llm  →  db/functions/jigi-llm/bundle.js
// Secrets (Supabase → Edge Functions → Secrets): OPENAI_API_KEY, optional OPENAI_MODEL. Never in the repo.
// deno-lint-ignore-file no-explicit-any
import {chatBody,LLM_DEFAULT} from '../../../app/core/llmModel';
import {extractPrompt,parseExtract,assistPrompt,parseAssist,explainPrompt,checkExplain,LLM_LIMIT} from '../../../app/core/jigi/llm';
declare const Deno:any;
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'POST only'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),openai=Deno.env.get('OPENAI_API_KEY');
  if(!openai)return json({fallback:true,error:'no-llm'});
  const me=await (await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:req.headers.get('authorization')??''}})).json().catch(()=>null);
  if(!me?.id)return json({error:'sign-in'},401);
  // private test (db/migrations/007): only players who entered an invite code
  const inv=await fetch(`${url}/rest/v1/invite_uses?player_id=eq.${me.id}&select=player_id`,{headers:{apikey:key,authorization:`Bearer ${key}`}}).catch(()=>null);
  if(!inv?.ok||!(await inv.json()).length)return json({error:'invite'},403);
  const b=await req.json().catch(()=>({})) as {mode?:string;journal?:any;block?:string;title?:string;topic?:string;facts?:unknown};
  const messages=b.mode==='extract'&&b.journal?extractPrompt(b.journal):b.mode==='assist'&&b.journal&&b.block?assistPrompt(b.journal,b.block,b.title??b.block)
    :b.mode==='explain'&&b.topic?explainPrompt(b.topic,b.facts):null;
  if(!messages)return json({error:'bad-request'},400);
  const day=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
  const take=await fetch(`${url}/rest/v1/rpc/llm_take`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},
    body:JSON.stringify({p:me.id,d:day,cap:LLM_LIMIT.perDay})});
  if(!take.ok||!(await take.json()))return json({fallback:true,limit:true});
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${openai}`,'content-type':'application/json'},
    body:JSON.stringify(chatBody(Deno.env.get('OPENAI_MODEL')??LLM_DEFAULT,messages,{out:b.mode==='extract'?700:260,temperature:b.mode==='extract'?0:0.4}))});
  if(!r.ok)return json({fallback:true,error:'llm'});
  const text:string=(await r.json())?.choices?.[0]?.message?.content??'';
  if(b.mode==='extract'){const d=parseExtract(text,b.journal);return json(d?{drafts:d}:{fallback:true})}
  if(b.mode==='assist'){const q=parseAssist(text);return json(q?{questions:q}:{fallback:true})}
  const t=checkExplain(text,b.facts);return json(t?{text:t}:{fallback:true});
});
