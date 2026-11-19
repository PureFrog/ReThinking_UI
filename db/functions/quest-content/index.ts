// Supabase edge function (Deno): 오늘의 관측소 content (daily_quest_design 7·8, db/migrations/009).
//   today   {}                                    any invited player: today's (KST) assignment — the master and the
//                                                 principle only, never a scene; none → the sample as practice
//   upload  {pack, report}                        editor: a pack built by tools/content/build-pack.mjs, stored as a draft
//                                                 (its report must have no error; the shape is checked again here)
//   approve {pack_id, version, review:{hold,sell}} approver, not the uploader: two journals that both play through
//   ops     {days?}                               editor: the model calls of the last days per task and model (failure
//                                                 rate, latency, tokens) and the editors' revision rate
//   publish {pack_id, version, day, level?}       approver: onto a free KST day and level (0 = every level without its
//                                                 own pack); the version is frozen from then on
// Every editor action leaves a line in editor_audit. Build: node tools/build-functions.mjs quest-content.
// deno-lint-ignore-file no-explicit-any
import {checkPackShape,checkReview} from '../../../app/core/game/daily/official';
import {kstDay,type DailyPack} from '../../../app/core/game/daily/model';
import {sha} from '../../../app/core/content/live/http';
import {summarizeOps,revisionRate} from '../../../app/core/content/ops';
import {COURSE} from '../../../app/core/game/daily/course';
declare const Deno:any;
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});

// a day with no published pack (발행 실패일): the oldest approved, never-used pack takes the day (level 0) and the
// audit says so; with none left, the day is plainly practice on the sample (design 7)
async function assignToday(get:(p:string)=>Promise<any[]>,send:(p:string,m:string,b:unknown,pr?:string)=>Promise<Response>,day:string){
  const used=new Set(((await get('daily_assignments?select=pack_id,version')) as any[]).map(a=>`${a.pack_id}@${a.version}`));
  const spare=((await get('packs?status=eq.approved&select=pack_id,version,approved_at&order=approved_at.asc')) as any[]).find(p=>!used.has(`${p.pack_id}@${p.version}`));
  if(!spare)return null;
  const r=await send('daily_assignments','POST',{day,level:0,pack_id:spare.pack_id,version:spare.version},'resolution=ignore-duplicates');
  if(!r.ok)return null;
  await send(`packs?pack_id=eq.${encodeURIComponent(spare.pack_id)}&version=eq.${spare.version}&status=eq.approved`,'PATCH',{status:'published',published_at:new Date().toISOString()});
  await send('editor_audit','POST',{editor:null,action:'auto-assign',pack_id:spare.pack_id,version:spare.version,detail:{day}});
  return (await get(`daily_assignments?day=eq.${day}&level=eq.0&select=pack_id,version,level`))[0]??null;
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'POST only'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const me=await (await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:req.headers.get('authorization')??''}})).json().catch(()=>null);
  if(!me?.id)return json({error:'sign-in'},401);
  const svc={apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'};
  const get=async(path:string)=>{const r=await fetch(`${url}/rest/v1/${path}`,{headers:svc});return r.ok?await r.json():[]};
  const send=(path:string,method:string,body:unknown,prefer='return=minimal')=>fetch(`${url}/rest/v1/${path}`,{method,headers:{...svc,prefer},body:JSON.stringify(body)});
  const b=await req.json().catch(()=>({})) as any;

  if(b.action==='today'){
    const inv=await get(`invite_uses?player_id=eq.${me.id}&select=player_id`);if(!inv.length)return json({error:'invite'},403);
    const day=kstDay(Date.now()),a=(await get(`daily_assignments?day=eq.${day}&select=pack_id,version,level&order=level.asc`))[0]??await assignToday(get,send,day);
    if(!a)return json({official:false,practice:true});
    const p=(await get(`packs?pack_id=eq.${encodeURIComponent(a.pack_id)}&version=eq.${a.version}&status=eq.published&select=body`))[0]?.body as DailyPack|undefined;
    if(!p)return json({official:false});
    return json({official:true,pack:a.pack_id,version:a.version,mentor:p.mentor,company:{alias:p.company.alias,business:p.company.business}});
  }
  const role=(await get(`editors?player_id=eq.${me.id}&select=role`))[0]?.role as 'editor'|'approver'|undefined;
  if(!role)return json({error:'editor'},403);
  const audit=(action:string,pack_id:string|null,version:number|null,detail:unknown)=>send('editor_audit','POST',{editor:me.id,action,pack_id,version,detail});

  // the course for the editors' preview (the server's only copy; never shipped in the app)
  if(b.action==='course')return json({course:COURSE});
  if(b.action==='ops'){
    const since=new Date(Date.now()-Math.min(90,Math.max(1,Number(b.days)||7))*864e5).toISOString();
    const rows=((await get(`llm_task_log?at=gte.${since}&select=at,fn,task,model,ok,ms,input,output,error&order=at.desc&limit=5000`)) as any[]);
    const ups=((await get(`editor_audit?action=eq.upload&at=gte.${since}&select=detail`)) as any[]).map(a=>a.detail?.llm).filter(Boolean);
    return json({since,lines:summarizeOps(rows),revision:revisionRate(ups),recentFailures:rows.filter(r=>!r.ok).slice(0,20).map(r=>({at:r.at,task:r.task,model:r.model,error:r.error}))});
  }
  if(b.action==='upload'){
    const p=b.pack as DailyPack,errors=checkPackShape(p,b.report);
    if(errors.length){await audit('upload-refused',p?.id??null,p?.version??null,{errors});return json({error:'shape',errors},422)}
    const r=await send('packs','POST',{pack_id:p.id,version:p.version,status:'draft',body:p,report:b.report,content_hash:await sha(JSON.stringify(p)),created_by:me.id},'return=minimal');
    if(!r.ok){await audit('upload-refused',p.id,p.version,{errors:['exists']});return json({error:'exists'},409)}
    // llm: {drafted, edited} from the editor screen — how many model drafts a person changed (the revision rate)
    const llm=b.llm&&Number.isFinite(b.llm.drafted)?{drafted:Number(b.llm.drafted),edited:Number(b.llm.edited)||0}:null;
    await audit('upload',p.id,p.version,{issues:(b.report??[]).length,llm});return json({ok:true,status:'draft'});
  }
  const id=String(b.pack_id??''),version=Number(b.version);
  const row=(await get(`packs?pack_id=eq.${encodeURIComponent(id)}&version=eq.${version}&select=status,body,created_by`))[0];
  if(!row)return json({error:'not-found'},404);
  if(b.action==='approve'){
    if(role!=='approver')return json({error:'approver'},403);
    if(row.created_by===me.id)return json({error:'second-pair-of-eyes'},403);
    if(row.status!=='draft')return json({error:`status ${row.status}`},409);
    const errors=checkReview(row.body,b.review,Date.now());
    if(errors.length){await audit('approve-refused',id,version,{errors});return json({error:'review',errors},422)}
    await send(`packs?pack_id=eq.${encodeURIComponent(id)}&version=eq.${version}&status=eq.draft`,'PATCH',{status:'approved',review:b.review,approved_by:me.id,approved_at:new Date().toISOString()});
    await audit('approve',id,version,null);return json({ok:true,status:'approved'});
  }
  if(b.action==='publish'){
    if(role!=='approver')return json({error:'approver'},403);
    if(row.status!=='approved')return json({error:`status ${row.status}`},409);
    const day=String(b.day??''),level=Number(b.level??0);if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day<kstDay(Date.now()))return json({error:'day'},422);
    if(!Number.isInteger(level)||level<0||level>5)return json({error:'level'},422);
    const a=await send('daily_assignments','POST',{day,level,pack_id:id,version,assigned_by:me.id});
    if(!a.ok){await audit('publish-refused',id,version,{day,errors:['day taken']});return json({error:'day-taken'},409)}
    await send(`packs?pack_id=eq.${encodeURIComponent(id)}&version=eq.${version}`,'PATCH',{status:'published',published_at:new Date().toISOString()});
    await audit('publish',id,version,{day,level});return json({ok:true,status:'published',day,level});
  }
  return json({error:'bad-request'},400);
});
