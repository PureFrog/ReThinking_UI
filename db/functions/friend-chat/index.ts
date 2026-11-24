// Supabase edge function (Deno): free talk with 보리 (app/core/friend.ts). The player's own sign-in names them; each
// player gets FRIEND_TALK.perDay answers a day (friend_talk_take in db/migrations/002_saves_and_delete.sql); the prompt
// and the safety filter are the app's own, so tests cover them. Nothing is stored but the day's count.
// Build one pasteable file: node tools/build-functions.mjs  →  db/functions/friend-chat/bundle.js
// Secrets (Supabase → Edge Functions → Secrets, never in the repo): OPENAI_API_KEY, optional OPENAI_MODEL (default gpt-6-luna, core/llmModel.ts).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are given to every function by Supabase.
// deno-lint-ignore-file no-explicit-any
import {chatBody,LLM_DEFAULT} from '../../../app/core/llmModel';
import {friendPrompt,friendSafe,FRIEND_TALK,type FriendCtx,type TalkLine} from '../../../app/core/friend';
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
  const {ctx,history,message}=await req.json().catch(()=>({})) as {ctx?:FriendCtx;history?:TalkLine[];message?:string};
  if(!ctx||typeof message!=='string'||!message.trim())return json({error:'bad-request'},400);
  // today's count (Korea time)
  const day=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
  const take=await fetch(`${url}/rest/v1/rpc/friend_talk_take`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},
    body:JSON.stringify({p:me.id,d:day,cap:FRIEND_TALK.perDay})});
  if(!take.ok)return json({error:'count'},500);
  if(!(await take.json()))return json({text:'오늘은 수다 많이 떨었다! 내일 또 얘기하자.',limit:true});
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${openai}`,'content-type':'application/json'},
    body:JSON.stringify(chatBody(Deno.env.get('OPENAI_MODEL')??LLM_DEFAULT,friendPrompt(ctx,(history??[]).filter(l=>l&&typeof l.text==='string'),message),{out:160,temperature:0.8,effort:'minimal'}))});
  // the model's own error message (no key in it), so a failure can be read in the response
  if(!r.ok)return json({error:'llm',status:r.status,detail:(await r.text().catch(()=>'')).slice(0,300)},502);
  const out=await r.json();
  return json({text:friendSafe(out?.choices?.[0]?.message?.content??'')});
});
