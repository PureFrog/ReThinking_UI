// Supabase edge function (Deno): an official 오늘의 관측소 run, scene by scene (daily_quest_design 8, db/migrations/009).
// The app never holds more of an official pack than the scene it is on (app/core/game/daily/official.ts sceneDto).
//   today  {}                               today's one request for this player (the server's course and their record;
//                                           feedback 2026-11-19: nothing still to come is ever sent), its state, the pack
//   start  {practice?}                      today's request on today's pack (a finished one only as practice) → the open
//                                           run, or a new one → the pack cut at scene 1
//   get    {run}                            the open run again (another device, a reload)
//   decide {run, scene, fraction, fields}   the hypothesis and the decision committed together → the next cut; after
//                                           the last scene the whole pack (reveal included), then quest-settle
//   draft  {run, scene, fields, revision}   save what is being written (design 8 PUT draft); a stale revision →
//                                           409 with the latest drafts, and the player chooses
//   hint   {run, field}                     one directionless question from this scene's visible cards only (call B);
//                                           no model or a refused reply → the fixed help
// Build: node tools/build-functions.mjs quest-play. Secrets: LLM_API_KEY (+ MODEL_HINT) for the hint, optional.
// deno-lint-ignore-file no-explicit-any
import {applyDraft,playDecide,sceneDto,type PlayState} from '../../../app/core/game/daily/official';
import {kstDay,FIELD_LABEL,type DailyPack,type FieldKey} from '../../../app/core/game/daily/model';
import {requestFor} from '../../../app/core/game/daily/course';
import {hintQuestion} from '../../../app/core/content/llm-tasks';
import {openAiCompatible} from '../../../app/core/content/live/llm';
import {withOps,refusedRow} from '../../../app/core/content/ops';
declare const Deno:any;
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});
// the fixed help per field when there is no model (the analyst who asks it, design 3-6)
const FIXED:Record<FieldKey,'tori'|'moa'|'luon'>={hypo:'tori',reason:'moa',counter:'luon',recheck:'luon',shift:'tori'};

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
  if(!(await get(`invite_uses?player_id=eq.${me.id}&select=player_id`)).length)return json({error:'invite'},403);
  const b=await req.json().catch(()=>({})) as any;
  const loadPack=async(id:string,version:number)=>(await get(`packs?pack_id=eq.${encodeURIComponent(id)}&version=eq.${Number(version)}&status=eq.published&select=body`))[0]?.body as DailyPack|undefined;
  const finishedRows=async()=>((await get(`quest_runs?player_id=eq.${me.id}&select=quest,settled_at`)) as {quest:string;settled_at:string}[]);
  const finished=async()=>(await finishedRows()).map(r=>r.quest);
  const today=kstDay(Date.now());
  const request=async()=>requestFor((await finishedRows()).map(r=>({quest:r.quest,day:kstDay(Date.parse(r.settled_at)||Date.now())})),today);
  // today's assignment: the pack for the request's level, or the day's pack for every level, or a spare approved one
  const assignment=async(level:number)=>{const as=(await get(`daily_assignments?day=eq.${today}&level=in.(0,${level})&select=pack_id,version,level`)) as any[];
    return as.find(x=>x.level===level)??as.find(x=>x.level===0)??await assignToday(get,send,today)};
  const awards=async()=>((await get(`quest_awards?player_id=eq.${me.id}&select=daily_id`)) as {daily_id:string}[]).map(a=>({dailyId:a.daily_id})) as any[];
  const stateOf=(row:any):PlayState=>({run:row.run_id,quest:row.quest,pack:row.pack_id,version:row.version,day:row.day,decisions:row.decisions});

  if(b.action==='today'){
    const r=await request();if(!r)return json({request:null});
    const a=await assignment(r.def.level),p=a?await loadPack(a.pack_id,a.version):null;
    const open=(await get(`quest_play?player_id=eq.${me.id}&quest=eq.${r.def.id}&day=eq.${today}&done=eq.false&select=run_id`))[0];
    return json({request:{def:r.def,done:r.done,run:open?.run_id??null},official:!!p,practice:!p,
      ...(p?{mentor:p.mentor,company:{alias:p.company.alias,business:p.company.business}}:{})});
  }
  if(b.action==='start'){
    const req=await request();if(!req)return json({error:'no-request'},404);
    if(req.done&&!b.practice)return json({error:'done-today'},409);
    const quest=req.def,day=today,a=await assignment(quest.level);
    if(!a)return json({error:'no-assignment'},404);
    const pack=await loadPack(a.pack_id,a.version);if(!pack)return json({error:'pack'},404);
    // the run already open for today's quest on this pack comes back as it is
    const open=(await get(`quest_play?player_id=eq.${me.id}&pack_id=eq.${encodeURIComponent(a.pack_id)}&quest=eq.${quest.id}&day=eq.${day}&done=eq.false&select=*`))[0];
    if(open)return json({run:open.run_id,quest:quest.id,def:quest,day,pack:a.pack_id,version:a.version,dto:sceneDto(pack,open.decisions.length),drafts:open.drafts,draftRev:open.draft_rev});
    const run=`p${Date.now().toString(36)}${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`.slice(0,40);
    const r=await send('quest_play','POST',{player_id:me.id,run_id:run,pack_id:a.pack_id,version:a.version,quest:quest.id,day});
    if(!r.ok)return json({error:'retry'},409);
    return json({run,quest:quest.id,def:quest,day,pack:a.pack_id,version:a.version,dto:sceneDto(pack,0)});
  }
  const row=(await get(`quest_play?player_id=eq.${me.id}&run_id=eq.${encodeURIComponent(String(b.run??''))}&select=*`))[0];
  if(!row)return json({error:'not-found'},404);
  const pack=await loadPack(row.pack_id,row.version);if(!pack)return json({error:'pack'},404);
  if(b.action==='get')return json({run:row.run_id,quest:row.quest,day:row.day,pack:row.pack_id,version:row.version,dto:sceneDto(pack,row.decisions.length),decisions:row.decisions,drafts:row.drafts,draftRev:row.draft_rev});
  if(b.action==='draft'){
    // only the scene being played (or one already decided) can hold a draft; never one not opened yet
    const open=pack.scenes.slice(0,Math.min(row.decisions.length+1,pack.scenes.length)).map(s=>s.id);
    const r=applyDraft({drafts:row.drafts??{},rev:Number(row.draft_rev)},String(b.scene??''),b.fields??{},Number(b.revision),open);
    if(!r.ok)return 'conflict' in r?json({error:'conflict',drafts:r.conflict.drafts,revision:r.conflict.rev},409):json({error:r.error},422);
    const u=await send(`quest_play?player_id=eq.${me.id}&run_id=eq.${encodeURIComponent(row.run_id)}&draft_rev=eq.${Number(row.draft_rev)}`,'PATCH',{drafts:r.doc.drafts,draft_rev:r.doc.rev,updated_at:new Date().toISOString()},'return=representation');
    if(!u.ok||!(await u.json()).length){const now=(await get(`quest_play?player_id=eq.${me.id}&run_id=eq.${encodeURIComponent(row.run_id)}&select=drafts,draft_rev`))[0];
      return json({error:'conflict',drafts:now?.drafts??{},revision:Number(now?.draft_rev??0)},409)}
    return json({revision:r.doc.rev});
  }
  if(b.action==='decide'){
    const r=playDecide(pack,stateOf(row),{scene:String(b.scene??''),fraction:b.fraction,fields:b.fields??{}},{finishedQuests:await finished(),awards:await awards()},Date.now());
    if(!r.ok)return json({error:r.error},422);
    // committed only if nobody committed this scene in the meantime (two taps, two devices): count must still match
    const u=await send(`quest_play?player_id=eq.${me.id}&run_id=eq.${encodeURIComponent(row.run_id)}&done=eq.false&step=eq.${Number(row.step)}`,
      'PATCH',{decisions:r.state.decisions,step:Number(row.step)+1,done:r.done,updated_at:new Date().toISOString()},'return=representation');
    if(!u.ok||!(await u.json()).length)return json({error:'retry'},409);
    return json({dto:r.dto,done:r.done,decisions:r.state.decisions});
  }
  if(b.action==='hint'){
    const k=Math.min(row.decisions.length,pack.scenes.length-1),scene=pack.scenes[k],field=(['hypo','reason','counter','recheck'].includes(b.field)?b.field:'hypo') as FieldKey;
    const visible=pack.scenes.filter(s=>s.no<=scene.no).flatMap(s=>s.cards);
    const env=(x:string)=>Deno.env.get(x),llm=env('LLM_API_KEY')?withOps(openAiCompatible({fetch,env,now:()=>Date.now()}),'quest-play',(r:any)=>{void send('llm_task_log','POST',{fn:r.fn,task:r.task,model:r.model,ok:r.ok,ms:r.ms,input:r.input,output:r.output,error:r.error})}):null;
    const fallback=scene.hints[FIXED[field]];
    if(!llm)return json({question:fallback,fromModel:false});
    return json(await hintQuestion(llm,{activeField:field,label:FIELD_LABEL[field],principle:pack.mentor.principle,ask:scene.ask,
      visibleCards:visible.map(c=>({id:c.id,kind:c.kind,fact:c.fact})),draft:String(b.draft??'').slice(0,600)},fallback,
      (task,model,why)=>{const r=refusedRow('quest-play',task,model,why);void send('llm_task_log','POST',{fn:r.fn,task:r.task,model:r.model,ok:r.ok,ms:r.ms,input:r.input,output:r.output,error:r.error})}));
  }
  return json({error:'bad-request'},400);
});
