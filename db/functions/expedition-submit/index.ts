// Supabase edge function (Deno), not deployed: checks a submitted 관측소 원정 run and stores the server's score.
// Build: bundle app/core/game/verify.ts into ./verify.js first (the app's imports have no .ts suffix, which Deno needs),
//   npx esbuild app/core/game/verify.ts --bundle --format=esm --outfile=db/functions/expedition-submit/verify.js
// Packs are read from the deployed site (public/game/packs/<id>.json). Env: PACKS_URL, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (set in the Supabase dashboard, never in the repo).
// deno-lint-ignore-file no-explicit-any
import {verifyRun} from './verify.js';
declare const Deno:any;
export default async function handler(req:Request):Promise<Response>{
  if(req.method!=='POST')return new Response('POST only',{status:405});
  const run=await req.json();
  const auth=req.headers.get('authorization')??'';
  const pack=await (await fetch(`${Deno.env.get('PACKS_URL')}/game/packs/${encodeURIComponent(run.pack)}.json`)).json();
  const v=verifyRun(pack,run);
  if(!v.ok)return new Response(JSON.stringify(v),{status:422});
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // who is submitting: the player's own JWT (Supabase auth) names them
  const me=await (await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:auth}})).json();
  if(!me?.id)return new Response('sign in first',{status:401});
  await fetch(`${url}/rest/v1/expedition_runs`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},
    body:JSON.stringify({player_id:me.id,pack_id:run.pack,week:run.week,decisions:run.decisions,orders:run.orders,swaps:run.swaps,total:v.total,ret:v.ret,hits:v.hits})});
  return new Response(JSON.stringify(v),{status:200,headers:{'content-type':'application/json'}});
}
