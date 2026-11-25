// The server side of 오늘의 관측소 (daily_quest_design 8·10), pure so the edge function and the tests run the same code
// the app does. The client sends what it wrote and chose; the server replays it on the same pack with the same rules
// and keeps only what it computes — the client's own score or XP is never read.
//   verifySubmission  replay + checks: pack and version, the course order (no skipping), the day, every scene's fields
//                     and choice. Ranked = the player's first settled run of that (day, pack, quest); after the day,
//                     practice.
//   progressFromAwards  investor_progress is derived from the award ledger, never stored on its own authority
//   withProgress / mergeProgress  writing it into the profile v5.0 doc (revision-conditional), and keeping it when
//                     보리's talk saves a profile it read before an award landed
import {blankFields,defOf,DIRS,FRACTIONS,SHIFTS,structured,award,blankProgress,decide,dailyIdOf,setDraft,setPick,setStage,startRun,type Award,type DailyPack,type DailyRun,type Fields,type Fraction,type InvestorProgress,type QuestId} from './model';
import {settle} from './settle';
import {TRIAL_JUDGE,precomputedJudge,type Judge} from './judge';
import {forecastFromExtract,type Forecast} from './forecast';
import {checkExtract,EXTRACT_SCHEMA,EXTRACT_SYSTEM} from '../../content/llm-tasks';
import {inputKey,toulminGrade,toulminInput,RUBRIC_VERSION,type OnRefuse} from '../../content/llm-tasks';
import type {LLMProvider} from '../../content/ports';
import {ownText,type DimGrade,type Dir,type Shift} from './model';
import {COURSE} from './course';

export type SubDecision={scene:string;fields:Partial<Fields>;fraction:Fraction};
export type Submission={run:string;quest:QuestId;pack:string;version:number;day:string;decisions:SubDecision[]};
// finishedOn: the KST day each finished quest was finished on (one new request a day)
export type ServerState={finishedQuests:string[];awards:Award[];finishedOn?:{quest:string;day:string}[]};
export type Verified={ok:true;run:DailyRun;award:Award|null;progress:InvestorProgress}|{ok:false;error:string};
const TEXT_MAX=600,FRACS:Fraction[]=FRACTIONS.map(f=>f.id);// the offered choices only (feedback F4)
const text=(v:unknown)=>typeof v==='string'?v.slice(0,TEXT_MAX):'';
// a picked target or period: an id from the scene's list (decide checks it is one of them)
const pickId=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9-]{1,24}$/.test(v)?v:null;

export function progressFromAwards(awards:Award[]):InvestorProgress{
  return [...awards].sort((a,b)=>a.at-b.at).reduce((p,a)=>award(p,a),blankProgress());
}

export function verifySubmission(pack:DailyPack|null,sub:Submission,st:ServerState,today:string,now:number,judge:Judge=TRIAL_JUDGE):Verified{
  const r=replaySubmission(pack,sub,st,today,now);if(!r.ok)return r;
  return finishRun(pack!,r.run,st,today,now,judge);
}
// the replay alone: the run with every decision checked and in, not settled yet (the Toulmin judge grades it next)
export function replaySubmission(pack:DailyPack|null,sub:Submission,st:ServerState,today:string,now:number):{ok:true;run:DailyRun}|{ok:false;error:string}{
  if(!pack||pack.id!==sub.pack||pack.version!==sub.version)return {ok:false,error:'pack'};
  const i=COURSE.findIndex(q=>q.id===sub.quest);if(i<0)return {ok:false,error:'quest'};
  if(i>0&&!st.finishedQuests.includes(COURSE[i-1].id))return {ok:false,error:'locked'};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(sub.day)||sub.day>today)return {ok:false,error:'day'};
  // one new request a day: a quest not finished before cannot be started on a day another one was finished
  if(!st.finishedQuests.includes(sub.quest)&&(st.finishedOn??[]).some(f=>f.day===sub.day&&f.quest!==sub.quest))return {ok:false,error:'one-a-day'};
  if(typeof sub.run!=='string'||!sub.run||sub.run.length>40)return {ok:false,error:'run'};
  const ds=Array.isArray(sub.decisions)?sub.decisions:[];
  if(ds.length!==pack.scenes.length)return {ok:false,error:'scenes'};
  return replaySteps(pack,sub,st,now);
}
// the decisions so far, in scene order, each checked as the app checks it (also used scene by scene by quest-play)
export function replaySteps(pack:DailyPack,sub:Submission,st:ServerState,now:number):{ok:true;run:DailyRun}|{ok:false;error:string}{
  const i=COURSE.findIndex(q=>q.id===sub.quest);if(i<0)return {ok:false,error:'quest'};
  const ds=Array.isArray(sub.decisions)?sub.decisions:[];
  if(ds.length>pack.scenes.length||ds.some((d,k)=>d?.scene!==pack.scenes[k].id))return {ok:false,error:'scenes'};
  const dailyId=dailyIdOf(sub.day,sub.quest,pack.id);
  let run:DailyRun={...startRun(pack,COURSE[i],sub.day,now,[],sub.run),mode:st.awards.some(a=>a.dailyId===dailyId)?'practice':'ranked'};
  run=setStage(run,'scene');
  for(const d of ds){
    if(!FRACS.includes(d.fraction))return {ok:false,error:`fraction:${d.scene}`};
    const f=d.fields??{},visible=pack.scenes.filter(s=>s.no<=pack.scenes.find(x=>x.id===d.scene)!.no).flatMap(s=>s.cards.map(c=>c.id));
    const fields:Fields={...blankFields(),hypo:text(f.hypo),reason:text(f.reason),counter:text(f.counter),recheck:text(f.recheck),ev:typeof f.ev==='string'&&visible.includes(f.ev)?f.ev:null,
      target:pickId(f.target),period:pickId(f.period),dir:DIRS.includes(f.dir as Dir)?f.dir as Dir:null,shift:SHIFTS.includes(f.shift as Shift)?f.shift as Shift:null};
    run=setPick(setDraft(run,d.scene,fields),d.scene,d.fraction);
    const o=decide(pack,run,d.scene,now);if('error' in o)return {ok:false,error:`${o.error}:${d.scene}`};
    run=o.run;
  }
  return {ok:true,run};
}
export function finishRun(pack:DailyPack,run:DailyRun,st:ServerState,today:string,now:number,judge:Judge,forecasts?:Record<string,Forecast>):Verified{
  const before=progressFromAwards(st.awards),s=settle(pack,{...run,finishedAt:null,result:null},before,today,now,judge,forecasts);
  const got=s.progress.awards.length>before.awards.length?s.progress.awards[s.progress.awards.length-1]:null;
  return {ok:true,run:s.run,award:got,progress:s.progress};
}

// the profile v5.0 doc as stored in llm1_docs ('profile'): revision on the doc and in its json move together
export type ProfileLike={revision:number;updated_at:string|null;json:Record<string,unknown>};
export const progressOf=(doc:ProfileLike|null)=>(doc?.json.investor_progress as InvestorProgress|undefined)??null;
export function withProgress<T extends ProfileLike>(doc:T,p:InvestorProgress,at:string):T{
  const revision=doc.revision+1;
  return {...doc,revision,updated_at:at,json:{...doc.json,investor_progress:p,revision,updated_at:at}};
}
// 보리's talk read the profile at `readRevision`, worked for a few seconds and is about to save `ours`; `latest` is the
// stored doc right now. investor_progress always comes from the latest (only quest-settle writes it), and if someone
// wrote in between, the revision moves past both so it never goes back.
export function mergeProgress<T extends ProfileLike>(ours:T,latest:ProfileLike|null,readRevision:number):T{
  if(!latest)return ours;
  const p=latest.json.investor_progress??ours.json.investor_progress;
  const revision=latest.revision>readRevision?Math.max(ours.revision,latest.revision)+1:ours.revision;
  return {...ours,revision,json:{...ours.json,...(p!==undefined?{investor_progress:p}:{}),revision}};
}

// the Toulmin judge (design 6·7) over a replayed run: one assessment per scene, keyed by its input so the same words
// always get the same grades (a stored grade is reused, never re-asked); throws when the model cannot give a valid
// answer, and the run waits as pending
export type GradeCache={get(key:string):Promise<DimGrade[]|null>;put(key:string,dims:DimGrade[],model:string):Promise<void>};
export async function toulminJudge(llm:LLMProvider,pack:DailyPack,run:DailyRun,cache:GradeCache,onRefuse?:OnRefuse):Promise<Judge>{
  const q=defOf(run),byScene:Record<string,DimGrade[]>={};
  for(const [k,d] of run.decisions.entries()){const scene=pack.scenes.find(s=>s.id===d.scene)!;
    const visible=pack.scenes.filter(s=>s.no<=scene.no).flatMap(s=>s.cards);
    const prev=k?run.decisions[k-1]:null,prevScene=prev?pack.scenes.find(s=>s.id===prev.scene):undefined;
    const input=toulminInput(q,scene,visible,pack.mentor.principle,d.fields,prev?prev.fields:null,pack.id,prevScene);
    const key=inputKey(input),hit=await cache.get(key);
    byScene[scene.id]=hit??await toulminGrade(llm,input,2,onRefuse);
    if(!hit)await cache.put(key,byScene[scene.id],llm.id)}
  return precomputedJudge(RUBRIC_VERSION,byScene);
}

// call A on the server: each scene's hypothesis → target, direction, deadline, quoted from the player (a reply that
// invents a number or a deadline is refused, and that scene falls back to the word rule)
export async function extractForecasts(llm:LLMProvider,pack:DailyPack,run:DailyRun,onRefuse?:OnRefuse):Promise<Record<string,Forecast>>{
  const q=defOf(run),out:Record<string,Forecast>={};
  // a structured hypothesis already says what, until when and which way: it is checked against the announced value
  for(const d of run.decisions){const s=pack.scenes.find(x=>x.id===d.scene);if(!s||structured(q,s))continue;const hypothesis=ownText(q,s,d.fields);
    try{const r=await llm.run<{claim:string;target:string;horizon:string;direction:string;evidenceRefs:string[]}>('extract','extract-v1',{hypothesis},EXTRACT_SCHEMA,EXTRACT_SYSTEM);
      const c=checkExtract(r.json,hypothesis);if(c.ok)out[s.id]=forecastFromExtract(c.draft,pack.evalTick-s.tick);else onRefuse?.('extract',r.model,c.why)}catch{/* the word rule stands in */}}
  return out;
}
