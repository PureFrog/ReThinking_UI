// Supabase edge function (Deno): settles a 오늘의 관측소 run (daily_quest_design 6·7·8·10, db/migrations/008, 009).
//   1. who: the player's own JWT; private test: only players who entered an invite code (like bori-talk)
//   2. replay: app/core/game/daily/server.ts on the same pack (the bundled sample, or a published pack from `packs`) —
//      the course order (no skipping), the day (KST; finished late = practice), every scene's fields and choice; the
//      client's own scores are never read
//   3. judge: with LLM_API_KEY the Toulmin judge (core/content/llm-tasks.ts, its reply checked by the server; one stored
//      assessment per input, so asking again cannot buy a better score). If the model cannot answer, the run is kept
//      as pending: returns shown now, 일지 점수·순위·XP '평가 중' until `result` grades it. Without a key: the trial judge.
//   4. record: quest_runs (once per run id) and, for the player's first scored run of that day/pack/quest, one
//      quest_awards row; the finished run unlocks the next quest even while its assessment waits
//   5. profile: investor_progress = the ledger folded, written into llm1_docs 'profile' only if the stored revision is
//      still the one read (PATCH … doc->>revision=eq.N); on a miss it reads again and retries. No profile yet → template.
// actions: settle {run, quest, pack, version, day, decisions[]} · result {run}  (a pending run: try the judge again)
//          progress {} (investor_progress + quests finished on the server) · ranking {daily_id} (scored ranked runs)
// Build: node tools/build-functions.mjs quest-settle. Secrets: LLM_API_KEY (+ LLM_BASE_URL, MODEL_JUDGE) to turn the
// Toulmin judge on; SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are given. Not deployed from here.
// deno-lint-ignore-file no-explicit-any
import {replaySubmission,finishRun,toulminJudge,extractForecasts,progressFromAwards,withProgress,type Submission,type GradeCache} from '../../../app/core/game/daily/server';
import {settlePending,summaryOf} from '../../../app/core/game/daily/settle';
import {checkExplain,EXPLAIN_SCHEMA,EXPLAIN_SYSTEM} from '../../../app/core/content/llm-tasks';
import {DIM_LABEL} from '../../../app/core/game/daily/judge';
import {sameDecisions} from '../../../app/core/game/daily/official';
import {completionGrants,dayGrants,type Grant} from '../../../app/core/game/daily/rewards';
import {TRIAL_JUDGE} from '../../../app/core/game/daily/judge';
import {kstDay,type Award,type DailyPack,type DailyRun} from '../../../app/core/game/daily/model';
import {RUBRIC_VERSION} from '../../../app/core/content/llm-tasks';
import {openAiCompatible} from '../../../app/core/content/live/llm';
import {withOps,refusedRow} from '../../../app/core/content/ops';
import {sha} from '../../../app/core/content/live/http';
import {serverPackById as packById} from '../../../app/content/daily/server-packs';
import {newProfile} from '../../../app/core/llm1/engine';
import userTemplate from '../../../app/content/llm1/user_profile_template.json';
declare const Deno:any;
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json'}});
const toAward=(r:any):Award=>({quest:r.quest,excess:Number(r.excess),journal:r.journal,market:r.market,writing:r.writing,bonus:r.bonus,xp:r.xp,dailyId:r.daily_id,runId:r.run_id,at:Date.parse(r.settled_at)});

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'POST only'},405);
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const me=await (await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:req.headers.get('authorization')??''}})).json().catch(()=>null);
  if(!me?.id)return json({error:'sign-in'},401);
  const svc={apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'};
  const inv=await fetch(`${url}/rest/v1/invite_uses?player_id=eq.${me.id}&select=player_id`,{headers:svc}).catch(()=>null);
  if(!inv?.ok||!(await inv.json()).length)return json({error:'invite'},403);
  const b=await req.json().catch(()=>({})) as {action?:string;daily_id?:string}&Partial<Submission>;
  const get=async(path:string)=>{const r=await fetch(`${url}/rest/v1/${path}`,{headers:svc});return r.ok?await r.json():[]};
  const send=(path:string,method:string,body:unknown,prefer='return=minimal')=>fetch(`${url}/rest/v1/${path}`,{method,headers:{...svc,prefer},body:JSON.stringify(body)});
  const ledger=async()=>((await get(`quest_awards?player_id=eq.${me.id}&select=*`)) as any[]).map(toAward);
  const finishedRows=async()=>((await get(`quest_runs?player_id=eq.${me.id}&select=quest,settled_at`)) as {quest:string;settled_at:string}[]);
  const finishedQuests=async()=>(await finishedRows()).map(r=>r.quest);
  // the bundled sample, or a published pack (db/migrations/009 packs; quest-content publishes them)
  const loadPack=async(id:string,version:number):Promise<DailyPack|null>=>{const s=packById(id);if(s)return s.version===version?s:null;
    const row=(await get(`packs?pack_id=eq.${encodeURIComponent(id)}&version=eq.${Number(version)}&status=eq.published&select=body`))[0];return row?.body??null};
  // the Toulmin judge when a model is configured; its grades are stored per input (quest_assessments)
  const env=(k:string)=>Deno.env.get(k);
  // every model call leaves one row in llm_task_log (011): task, model, ok, time, tokens — never text
  const opsRow=(r:any)=>{void send('llm_task_log','POST',{fn:r.fn,task:r.task,model:r.model,ok:r.ok,ms:r.ms,input:r.input,output:r.output,error:r.error})};
  const llm=env('LLM_API_KEY')?withOps(openAiCompatible({fetch,env,now:()=>Date.now()}),'quest-settle',opsRow):null;
  // a reply that came back but failed its check counts as a failure in the operations view
  const refused=(task:any,model:string,why:string)=>opsRow(refusedRow('quest-settle',task,model,why));
  const cache:GradeCache={async get(k){const r=(await get(`quest_assessments?player_id=eq.${me.id}&input_key=eq.${await sha(k)}&select=grades`))[0];return r?.grades??null},
    async put(k,dims,model){await send('quest_assessments','POST',{player_id:me.id,input_key:await sha(k),grades:dims,model,rubric:RUBRIC_VERSION},'resolution=ignore-duplicates')}};
  const judgeFor=async(pack:DailyPack,run:DailyRun)=>{if(!llm)return TRIAL_JUDGE;try{return await toulminJudge(llm,pack,run,cache,refused)}catch{return null}};

  // write investor_progress into the profile, revision-conditional, a few tries
  const writeProgress=async(progress:ReturnType<typeof progressFromAwards>)=>{
    for(let k=0;k<4;k++){
      const at=new Date().toISOString(),row=(await get(`llm1_docs?player_id=eq.${me.id}&coll=eq.profile&select=doc`))[0];
      if(!row){const doc=withProgress(newProfile(me.id,structuredClone(userTemplate) as any),progress,at);
        const r=await send('llm1_docs','POST',{player_id:me.id,coll:'profile',doc,updated_at:at},'return=representation,resolution=ignore-duplicates');
        if(r.ok&&(await r.json()).length)return true;continue}// someone created it first: read it and try again
      // nothing changed (a practice run, a repeat, a pending one): leave the profile and its revision alone
      if(JSON.stringify(row.doc?.json?.investor_progress)===JSON.stringify(progress))return true;
      const doc=row.doc,next=withProgress(doc,progress,at);
      const r=await send(`llm1_docs?player_id=eq.${me.id}&coll=eq.profile&doc->>revision=eq.${Number(doc.revision)}`,'PATCH',{doc:next,updated_at:at},'return=representation');
      if(r.ok&&(await r.json()).length)return true;// zero rows: the revision moved under us — read again
    }
    return false;
  };
  // rewards (db/migrations/010): completion ones when a run is scored, the day's titles once the day is over
  const myGrants=async()=>((await get(`reward_grants?player_id=eq.${me.id}&select=reward_key,rule,period,label,item`)) as any[]).map(g=>({key:g.reward_key,rule:g.rule,period:g.period,label:g.label,item:g.item})) as Grant[];
  const grant=async(gs:Grant[])=>{for(const g of gs)await send('reward_grants','POST',{player_id:me.id,reward_key:g.key,rule:g.rule,period:g.period,label:g.label,item:g.item},'resolution=ignore-duplicates')};
  const scoredRanked=async()=>((await get(`quest_runs?player_id=eq.${me.id}&mode=eq.ranked&assessment=eq.scored&select=run_id,daily_id,journal,excess`)) as any[]);
  const grantCompletions=async()=>grant(completionGrants((await scoredRanked()).map(r=>({day:String(r.daily_id).slice(0,10),dailyId:r.daily_id,runId:r.run_id}))));
  const grantClosedDays=async()=>{const today=kstDay(Date.now());
    for(const r of await scoredRanked()){const day=String(r.daily_id).slice(0,10);if(day>=today)continue;
      const cohort=(await get(`quest_runs?daily_id=eq.${encodeURIComponent(r.daily_id)}&mode=eq.ranked&assessment=eq.scored&select=journal,excess`)) as any[];
      await grant(dayGrants(r.daily_id,day,today,cohort.map(c=>({journal:c.journal,excess:Number(c.excess)})),{journal:r.journal,excess:Number(r.excess)}))}};
  const award=async(a:Award,judge:string)=>send('quest_awards','POST',{player_id:me.id,daily_id:a.dailyId,run_id:a.runId,quest:a.quest,excess:a.excess,journal:a.journal,
    market:a.market,writing:a.writing,bonus:a.bonus,xp:a.xp,grade_version:judge},'resolution=ignore-duplicates');

  if(b.action==='progress'){await grantClosedDays();return json({progress:progressFromAwards(await ledger()),finished:[...new Set(await finishedQuests())],grants:await myGrants()})}
  if(b.action==='ranking'){const id=String(b.daily_id??'').slice(0,80);if(!id)return json({error:'bad-request'},400);
    // one cohort: the same day, pack and quest (so the same level, in the daily id) and the same judge version — trial
    // and Toulmin scores are never ranked together; sorted by the asked measure, 50 a page (cursor = the next offset)
    const gv=String((b as any).grade_version??'').slice(0,40),metric=(b as any).metric==='excess'?'excess':'journal',offset=Math.max(0,Number((b as any).cursor)||0);
    const rows=(await get(`quest_runs?daily_id=eq.${encodeURIComponent(id)}&mode=eq.ranked&assessment=eq.scored${gv?`&grade_version=eq.${encodeURIComponent(gv)}`:''}&select=player_id,journal,excess&order=${metric}.desc&limit=51&offset=${offset}`)) as any[];
    const more=rows.length>50;rows.splice(50);
    const ids=[...new Set(rows.map(r=>r.player_id))],names=new Map(((ids.length?await get(`players?id=in.(${ids.join(',')})&select=id,handle`):[]) as any[]).map(p=>[p.id,p.handle]));
    return json({rows:rows.map(r=>({name:names.get(r.player_id)??'관측원',journal:r.journal,ret:Number(r.excess),...(r.player_id===me.id?{me:true}:{})})),next:more?offset+50:null})}

  const runId=String(b.run??'').slice(0,40);
  if(b.action==='explain'){
    // call C: the settled result's facts reworded, or the rule sentence itself
    const row=(await get(`quest_runs?player_id=eq.${me.id}&run_id=eq.${encodeURIComponent(runId)}&select=result`))[0];if(!row)return json({error:'not-found'},404);
    const res=(row.result as DailyRun).result!,dims=res.scenes.flatMap(s=>s.dims).map(d=>({label:DIM_LABEL[d.key],grade:d.grade})),facts=summaryOf(res,dims);
    if(!llm)return json({text:facts,fromModel:false});
    try{const r=await llm.run<{text:string}>('explain','explain-v1',{facts},EXPLAIN_SCHEMA,EXPLAIN_SYSTEM);const c=checkExplain(r.json,facts);if(c.ok)return json({text:c.text,fromModel:true});refused('explain',r.model,c.why)}catch{/* the rule sentence stands */}
    return json({text:facts,fromModel:false});
  }
  if(b.action==='result'){
    // a pending run: try the judge again; when it answers, score it, pay its award and write the profile
    const row=(await get(`quest_runs?player_id=eq.${me.id}&run_id=eq.${encodeURIComponent(runId)}&select=assessment,result,mode`))[0];
    if(!row)return json({error:'not-found'},404);
    if(row.assessment!=='pending')return json({run:row.result,mode:row.mode,progress:progressFromAwards(await ledger())});
    const pending=row.result as DailyRun,pack=await loadPack(pending.pack,pending.version);if(!pack)return json({error:'pack'},422);
    const judge=await judgeFor(pack,pending);
    if(!judge)return json({run:pending,mode:row.mode,pending:true,progress:progressFromAwards(await ledger())});
    const awards=await ledger(),day=kstDay(pending.finishedAt??Date.now());// scored as of the day it was finished
    const fc=llm?await extractForecasts(llm,pack,pending,refused):undefined;
    const v=finishRun(pack,{...pending,mode:row.mode},{finishedQuests:[],awards},day,pending.finishedAt??Date.now(),judge,fc);
    if(!v.ok)return json({error:v.error},422);
    const res=v.run.result!;
    await send(`quest_runs?player_id=eq.${me.id}&run_id=eq.${encodeURIComponent(runId)}&assessment=eq.pending`,'PATCH',{assessment:'scored',journal:res.journal,grade_version:res.judge,result:v.run});
    if(v.award)await award(v.award,res.judge);
    await grantCompletions();
    const progress=progressFromAwards(await ledger());
    return json({run:v.run,mode:v.run.mode,progress,grants:await myGrants(),profileSaved:await writeProgress(progress)});
  }
  if(b.action!=='settle')return json({error:'bad-request'},400);
  // the same run sent twice (a retry, two taps): the first answer stands
  const prev=(await get(`quest_runs?player_id=eq.${me.id}&run_id=eq.${encodeURIComponent(runId)}&select=mode,result,assessment`))[0];
  if(prev)return json({run:prev.result,mode:prev.mode,pending:prev.assessment==='pending',progress:progressFromAwards(await ledger()),repeat:true});
  const now=Date.now(),today=kstDay(now);
  const pack=await loadPack(String(b.pack??''),Number(b.version));
  const rows=await finishedRows(),st={finishedQuests:rows.map(r=>r.quest),finishedOn:rows.map(r=>({quest:r.quest,day:kstDay(Date.parse(r.settled_at)||Date.now())})),awards:await ledger()};
  const r=replaySubmission(pack,b as Submission,st,today,now);
  if(!r.ok)return json({error:r.error},422);
  // once official packs run, a day without one is plain practice on the sample (no ranking, no XP — design 7)
  if(pack?.sample&&(await get('packs?status=eq.published&select=pack_id&limit=1')).length)r.run={...r.run,mode:'practice'};
  // an official pack: exactly the decisions committed scene by scene through quest-play (no peeking, then rewriting)
  if(pack&&!pack.sample){const play=(await get(`quest_play?player_id=eq.${me.id}&run_id=eq.${encodeURIComponent(runId)}&select=decisions,done,pack_id,version`))[0];
    const kept=r.run.decisions.map(x=>({scene:x.scene,fraction:x.fraction,fields:x.fields}));
    if(!play||!play.done||play.pack_id!==pack.id||play.version!==pack.version||!sameDecisions(play.decisions,kept))return json({error:'not-committed'},422)}
  const judge=await judgeFor(pack!,r.run),fc=llm?await extractForecasts(llm,pack!,r.run,refused):undefined;
  const v=judge?finishRun(pack!,r.run,st,today,now,judge,fc):{ok:true as const,run:settlePending(pack!,r.run,progressFromAwards(st.awards),today,now,fc),award:null,progress:progressFromAwards(st.awards)};
  if(!v.ok)return json({error:v.error},422);
  const res=v.run.result!;
  const ins=await send('quest_runs','POST',{player_id:me.id,run_id:runId,daily_id:v.run.dailyId,quest:v.run.quest,pack_id:v.run.pack,pack_version:v.run.version,
    grade_version:res.judge,mode:v.run.mode,decisions:v.run.decisions,journal:res.pending?null:res.journal,assessment:res.pending?'pending':'scored',
    excess:Math.round(res.excess*100)/100,result:v.run});
  // a second ranked run of the same day landed at the same moment (unique index): ask the app to send it again
  if(!ins.ok)return json({error:'retry'},409);
  if(v.award)await award(v.award,res.judge);
  if(!res.pending)await grantCompletions();
  const progress=progressFromAwards(await ledger());
  return json({run:v.run,mode:v.run.mode,pending:!!res.pending,progress,grants:await myGrants(),profileSaved:await writeProgress(progress)});
});
