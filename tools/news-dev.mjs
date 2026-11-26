// Local stand-in for the news-feed server function (db/functions/news-feed), to see real articles in the app before
// deploying: same request and reply, same parsing (app/core/content/live/naver.ts), no sign-in, no cache.
// The Naver keys stay in this process; they are read from an env file and never printed or sent to the browser.
//   node tools/news-dev.mjs [path/to/.env] [port]      (default ../investment-evidence-system/.env, 8787)
// then start the app with NEXT_PUBLIC_NEWS_FEED_URL=http://127.0.0.1:8787 (app/proto3d/supabase.ts liveNews).
import http from 'node:http';
import fs from 'node:fs';
import {load} from '../tests/load-app.mjs';
const N=await load('core/content/live/naver');
const envPath=process.argv[2]??'../investment-evidence-system/.env',port=Number(process.argv[3]??8787);
const env=Object.fromEntries(fs.readFileSync(envPath,'utf8').split(/\r?\n/).map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^['"]|['"]$/g,'')]));
const id=env.NAVER_API_HUB_CLIENT_ID,secret=env.NAVER_API_HUB_CLIENT_SECRET;
if(!id||!secret){console.error(`NAVER_API_HUB_CLIENT_ID / NAVER_API_HUB_CLIENT_SECRET not found in ${envPath}`);process.exit(1)}
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS'};
http.createServer(async(req,res)=>{
  const send=(code,body)=>{res.writeHead(code,{...cors,'content-type':'application/json'});res.end(JSON.stringify(body))};
  if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end()}
  if(req.method!=='POST')return send(405,{error:'POST only'});
  let raw='';for await(const c of req)raw+=c;
  const stocks=(JSON.parse(raw||'{}').stocks??[]).filter(s=>/^\d{6}$/.test(s?.code)&&typeof s.name==='string').slice(0,20);
  const news={},errors=[];
  await Promise.all(stocks.map(async s=>{try{
    const r=await fetch(`${N.NAVER_NEWS_URL}?${new URLSearchParams(N.naverQuery(s.name,s.code))}`,{headers:{'X-NCP-APIGW-API-KEY-ID':id,'X-NCP-APIGW-API-KEY':secret}});
    if(!r.ok)throw new Error(String(r.status));
    news[s.code]=N.naverItems(await r.json(),s.code,s.name).slice(0,8);
  }catch(e){errors.push(`${s.code}:${e.message}`)}}));
  console.log(new Date().toLocaleTimeString(),stocks.map(s=>`${s.name} ${news[s.code]?.length??'x'}`).join(', '),errors.length?`errors ${errors.join(' ')}`:'');
  send(200,{news,errors});
}).listen(port,'127.0.0.1',()=>console.log(`news-dev on http://127.0.0.1:${port} (keys from ${envPath})`));
