// Supabase edge function (Deno): today's real news on the player's stocks, from the NAVER API HUB news search
// (app/core/content/live/naver.ts). Shown in the 통신기 뉴스 탭 and the 뉴스 표지판 in place of the 모의 기사.
// Signed-in players who entered an invite code only (same gate as portfolio-read). Each stock's search is kept in
// news_cache (db/migrations/016_news_cache.sql) for 30 minutes, so many players on one stock cost one call: the
// search allows 25,000 calls a day. A failed search falls back to the stock's last cached list, else nothing.
// Build one pasteable file: node tools/build-functions.mjs news-feed  →  db/functions/news-feed/bundle.js
// Secrets (Supabase → Edge Functions → Secrets): NAVER_API_HUB_CLIENT_ID, NAVER_API_HUB_CLIENT_SECRET. Never in the repo.
// deno-lint-ignore-file no-explicit-any
import {NAVER_NEWS_URL,naverItems,naverQuery,type LiveNews} from '../../../app/core/content/live/naver';
declare const Deno:any;
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});
const FRESH_MS=30*60e3,MAX_STOCKS=20,PER_STOCK=8;

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'POST only'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const id=Deno.env.get('NAVER_API_HUB_CLIENT_ID'),secret=Deno.env.get('NAVER_API_HUB_CLIENT_SECRET');
  if(!id||!secret)return json({error:'no-news-key'},503);
  const me=await (await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:req.headers.get('authorization')??''}})).json().catch(()=>null);
  if(!me?.id)return json({error:'sign-in'},401);
  const inv=await fetch(`${url}/rest/v1/invite_uses?player_id=eq.${me.id}&select=player_id`,{headers:{apikey:key,authorization:`Bearer ${key}`}}).catch(()=>null);
  if(!inv?.ok||!(await inv.json()).length)return json({error:'invite'},403);
  const {stocks}=await req.json().catch(()=>({})) as {stocks?:{code?:unknown;name?:unknown}[]};
  const list=(Array.isArray(stocks)?stocks:[]).filter(s=>typeof s?.code==='string'&&/^\d{6}$/.test(s.code)&&typeof s.name==='string'&&s.name.length>0&&s.name.length<=30)
    .filter((s,i,a)=>a.findIndex(x=>x.code===s.code)===i).slice(0,MAX_STOCKS) as {code:string;name:string}[];
  if(!list.length)return json({news:{},errors:[]});
  const db={apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'};
  const cached=new Map<string,{items:LiveNews[];fetched_at:string;name:string}>();
  const r0=await fetch(`${url}/rest/v1/news_cache?code=in.(${list.map(s=>s.code).join(',')})&select=code,name,items,fetched_at`,{headers:db}).catch(()=>null);
  if(r0?.ok)for(const r of await r0.json())cached.set(r.code,r);
  const news:Record<string,LiveNews[]>={},errors:string[]=[],fresh:{code:string;name:string;items:LiveNews[];fetched_at:string}[]=[];
  await Promise.all(list.map(async s=>{
    const c=cached.get(s.code);
    if(c&&c.name===s.name&&Date.now()-Date.parse(c.fetched_at)<FRESH_MS){news[s.code]=c.items.slice(0,PER_STOCK);return}
    try{
      const r=await fetch(`${NAVER_NEWS_URL}?${new URLSearchParams(naverQuery(s.name,s.code))}`,{headers:{'X-NCP-APIGW-API-KEY-ID':id,'X-NCP-APIGW-API-KEY':secret}});
      if(!r.ok)throw new Error(String(r.status));
      const items=naverItems(await r.json(),s.code,s.name);
      fresh.push({code:s.code,name:s.name,items,fetched_at:new Date().toISOString()});
      news[s.code]=items.slice(0,PER_STOCK);
    }catch{errors.push(s.code);if(c)news[s.code]=c.items.slice(0,PER_STOCK)}
  }));
  if(fresh.length)await fetch(`${url}/rest/v1/news_cache`,{method:'POST',headers:{...db,prefer:'resolution=merge-duplicates'},body:JSON.stringify(fresh)}).catch(()=>null);
  return json({news,errors});
});
