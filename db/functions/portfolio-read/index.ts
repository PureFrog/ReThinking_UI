// Supabase edge function (Deno): reads the holdings off a brokerage screenshot (app/core/capture.ts, OpenAI vision).
// Signed-in players only; counted in llm_take with the other AI calls (db/migrations/003_jigi.sql). The picture is
// not stored anywhere: it is sent to OpenAI once and dropped. Only names and the numbers beside them come back.
// Build one pasteable file: node tools/build-functions.mjs portfolio-read  →  db/functions/portfolio-read/bundle.js
// Secrets (Supabase → Edge Functions → Secrets): OPENAI_API_KEY, optional OPENAI_VISION_MODEL. Never in the repo.
// deno-lint-ignore-file no-explicit-any
import {chatBody,VISION_DEFAULT} from '../../../app/core/llmModel';
import {capturePrompt,parseCapture,CAPTURE} from '../../../app/core/capture';
import {LLM_LIMIT} from '../../../app/core/jigi/llm';
declare const Deno:any;
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'POST only'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),openai=Deno.env.get('OPENAI_API_KEY');
  if(!openai)return json({error:'no-llm'},503);
  const me=await (await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:req.headers.get('authorization')??''}})).json().catch(()=>null);
  if(!me?.id)return json({error:'sign-in'},401);
  // private test (db/migrations/007): only players who entered an invite code
  const inv=await fetch(`${url}/rest/v1/invite_uses?player_id=eq.${me.id}&select=player_id`,{headers:{apikey:key,authorization:`Bearer ${key}`}}).catch(()=>null);
  if(!inv?.ok||!(await inv.json()).length)return json({error:'invite'},403);
  const {image}=await req.json().catch(()=>({})) as {image?:string};
  if(typeof image!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(image)||image.length>CAPTURE.maxBytes*1.4)return json({error:'bad-image'},400);
  const day=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
  const take=await fetch(`${url}/rest/v1/rpc/llm_take`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({p:me.id,d:day,cap:LLM_LIMIT.perDay})});
  if(!take.ok||!(await take.json()))return json({error:'limit'},429);
  const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${openai}`,'content-type':'application/json'},
    body:JSON.stringify(chatBody(Deno.env.get('OPENAI_VISION_MODEL')??VISION_DEFAULT,
      [{role:'system',content:capturePrompt()},{role:'user',content:[{type:'text',text:'이 캡처의 보유 종목을 읽어 줘.'},{type:'image_url',image_url:{url:image,detail:'high'}}]}],{out:1500,temperature:0}))});
  if(!r.ok)return json({error:'llm'},502);
  const holdings=parseCapture((await r.json())?.choices?.[0]?.message?.content??'');
  return holdings?json({holdings}):json({error:'unreadable'},422);
});
