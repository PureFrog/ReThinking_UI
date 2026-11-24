// Supabase edge function (Deno): 루온's stock debate (app/core/debate-chat.ts). The player's own sign-in names them; the
// answers share 보리's daily count (friend_talk_take, FRIEND_TALK.perDay in app/core/friend.ts); the prompt and the
// safety filter are the app's own, so tests cover them. Nothing is stored but the day's count.
// Build one pasteable file: node tools/build-functions.mjs debate-chat  →  db/functions/debate-chat/bundle.js
// Secrets (Supabase → Edge Functions → Secrets, never in the repo): OPENAI_API_KEY, optional OPENAI_MODEL (core/llmModel.ts).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are given to every function by Supabase.
// deno-lint-ignore-file no-explicit-any
import {chatBody,LLM_DEFAULT} from '../../../app/core/llmModel';
import {debatePrompt,debateSafe,type DebateCtx} from '../../../app/core/debate-chat';
import {FRIEND_TALK} from '../../../app/core/friend';
import type {ChatLine} from '../../../app/core/bori-chat';
declare const Deno:any;
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'POST only'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),openai=Deno.env.get('OPENAI_API_KEY');
  if(!openai)return json({error:'no-llm'},503);
  // who is talking: the player's JWT
  const me=await (await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:req.headers.get('authorization')??''}})).json().catch(()=>null);
  if(!me?.id)return json({error:'sign-in'},401);
  // private test (db/migrations/007): only players who entered an invite code
  const inv=await fetch(`${url}/rest/v1/invite_uses?player_id=eq.${me.id}&select=player_id`,{headers:{apikey:key,authorization:`Bearer ${key}`}}).catch(()=>null);
  if(!inv?.ok||!(await inv.json()).length)return json({error:'invite'},403);
  const {ctx,history,message}=await req.json().catch(()=>({})) as {ctx?:DebateCtx;history?:ChatLine[];message?:string};
  if(!ctx||typeof message!=='string'||!message.trim())return json({error:'bad-request'},400);
  const safeCtx:DebateCtx={hour:Number(ctx.hour)||0,stock:ctx.stock&&typeof ctx.stock.name==='string'?{name:ctx.stock.name.slice(0,30),code:typeof ctx.stock.code==='string'?ctx.stock.code.slice(0,12):null,
    real:!!ctx.stock.real,rate:Number(ctx.stock.rate)||0}:null,notes:Array.isArray(ctx.notes)?ctx.notes.filter(n=>typeof n==='string').slice(0,8).map(n=>n.slice(0,200)):[]};
  // today's count (Korea time), shared with 보리's free talk
  const day=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
  const take=await fetch(`${url}/rest/v1/rpc/friend_talk_take`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},
    body:JSON.stringify({p:me.id,d:day,cap:FRIEND_TALK.perDay})});
  if(!take.ok)return json({error:'count'},500);
  if(!(await take.json()))return json({text:'오늘은 얘기 많이 했다. 내일 이어서 하자.',limit:true});
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${openai}`,'content-type':'application/json'},
    body:JSON.stringify(chatBody(Deno.env.get('OPENAI_MODEL')??LLM_DEFAULT,debatePrompt(safeCtx,(history??[]).filter(l=>l&&typeof l.text==='string'),message),{out:220,temperature:0.6,effort:'minimal'}))});
  // the model's own error message (no key in it), so a failure can be read in the response
  if(!r.ok)return json({error:'llm',status:r.status,detail:(await r.text().catch(()=>'')).slice(0,300)},502);
  const out=await r.json();
  return json({text:debateSafe(out?.choices?.[0]?.message?.content??'')});
});
