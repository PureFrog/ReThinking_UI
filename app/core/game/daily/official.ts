// Official packs, scene by scene (daily_quest_design 8: "공개 전 팩 전체를 내려 보내면 익명화·미래 정보 통제가 깨진다.
// 신규 공식 판은 서버가 현재 장면 DTO만 생성한다"). The app only ever holds a pack cut at the scene it is on:
//   later scenes are blank stubs (their place, no title, no card), prices and the market stop at this scene's close,
//   the evaluation day and the whole reveal are absent. The next scene is cut only after this one's decision is
//   committed on the server (quest-play), and settle checks the submitted decisions against the committed ones.
// The sample pack is public already and keeps being played whole on the device.
import {type DailyPack,type Scene} from './model';
import {replaySteps,type ServerState,type SubDecision,type Submission} from './server';

// what was announced later is future at every scene: it reaches the app only with the whole pack, at the end
const noActual=(s:Scene):Scene=>s.observe?{...s,observe:{...s.observe,actual:undefined}}:s;
const stub=(s:Scene):Scene=>({id:s.id,no:s.no,title:'',tick:-1,situation:'',cards:[],focus:['',''],ask:'',check:null,hints:{tori:'',moa:'',luon:''}});
// the pack as the app may see it at scene k (0-based); k = scenes.length means finished: the whole pack, reveal included
export function sceneDto(pack:DailyPack,k:number):DailyPack{
  if(k>=pack.scenes.length)return pack;
  const t=pack.scenes[k].tick;
  return {...pack,scenes:pack.scenes.map((s,i)=>i<=k?noActual(s):stub(s)),prices:pack.prices.slice(0,t+1),index:pack.index.slice(0,t+1),evalTick:-1,
    ...(pack.others?{others:pack.others.map(o=>({...o,prices:o.prices.slice(0,t+1),...(o.splits?{splits:o.splits.filter(x=>x.tick<=t)}:{}),...(o.dividends?{dividends:o.dividends.filter(x=>x.tick<=t)}:{})}))}:{}),...(pack.splits?{splits:pack.splits.filter(x=>x.tick<=t)}:{}),
    ...(pack.dividends?{dividends:pack.dividends.filter(d=>d.tick<=t)}:{}),...(pack.news?{news:pack.news.filter(n=>n.tick<=t)}:{}),
    reveal:{company:'',period:'',event:'',summary:'',manager:'',holdings:[],holdingsNote:'',sources:[]}};
}
// the fill of the decision just made needs the next day's open: it is shown only after the decision is committed,
// as part of the next cut (or the full pack at the end)
export type PlayState={run:string;quest:Submission['quest'];pack:string;version:number;day:string;decisions:SubDecision[]};
export function playDecide(pack:DailyPack,st:PlayState,d:SubDecision,server:ServerState,now:number):{ok:true;state:PlayState;dto:DailyPack;done:boolean}|{ok:false;error:string}{
  const k=st.decisions.length;
  if(k>=pack.scenes.length)return {ok:false,error:'finished'};
  if(d?.scene!==pack.scenes[k].id)return {ok:false,error:'order'};
  const decisions=[...st.decisions,{scene:d.scene,fraction:d.fraction,fields:d.fields??{}}];
  const r=replaySteps(pack,{run:st.run,quest:st.quest,pack:st.pack,version:st.version,day:st.day,decisions},server,now);
  if(!r.ok)return r;
  // keep what the replay kept (capped, cleaned fields), so settle compares like with like
  const kept=r.run.decisions.map(x=>({scene:x.scene,fraction:x.fraction,fields:x.fields}));
  const done=kept.length===pack.scenes.length;
  return {ok:true,state:{...st,decisions:kept},dto:sceneDto(pack,done?pack.scenes.length:kept.length),done};
}
// settle's check for an official pack: the submitted decisions are exactly the ones committed scene by scene
export const sameDecisions=(a:SubDecision[],b:SubDecision[])=>a.length===b.length&&a.every((x,i)=>x.scene===b[i].scene&&x.fraction===b[i].fraction&&
  ['hypo','reason','counter','recheck','ev','target','period','dir','shift'].every(k=>((x.fields as Record<string,unknown>)?.[k]??'')===((b[i].fields as Record<string,unknown>)?.[k]??'')));

// an uploaded pack, before it is stored as a draft: the shape the app and the replay rely on (the content checks ran
// on the content machine; their report must carry no error)
export function checkPackShape(p:DailyPack,report:{level:string}[]):string[]{
  const e:string[]=[];
  if(!p||typeof p.id!=='string'||!/^[a-z0-9-]{3,40}$/.test(p.id))e.push('id');
  if(!Number.isInteger(p?.version)||p.version<1)e.push('version');
  if(p?.sample)e.push('sample');
  if(!Array.isArray(p?.scenes)||p.scenes.length!==3)e.push('scenes');
  else p.scenes.forEach((s,i)=>{if(s.no!==i+1)e.push(`scene ${i+1} no`);if(!(s.cards?.length>=3&&s.cards.length<=5))e.push(`scene ${i+1} cards`);
    if(i&&s.tick<=p.scenes[i-1].tick+1)e.push(`scene ${i+1} order`)});
  if(!Array.isArray(p?.prices)||!Array.isArray(p?.index)||p.prices.length!==p.index.length||p.prices.length<=p.evalTick)e.push('prices');
  if(Array.isArray(p?.scenes)&&p.scenes.length&&!(p.evalTick>p.scenes[p.scenes.length-1].tick+1))e.push('eval');
  if(!p?.mentor?.principle||!p?.mentor?.name)e.push('mentor');
  // several companies: each with the same days of prices; a scene's target must be one of them
  const slots=['A',...(p?.others??[]).map(o=>o.slot)];
  for(const o of p?.others??[])if(!['B','C'].includes(o.slot)||!Array.isArray(o.prices)||o.prices.length!==p.prices?.length||!(o.qty>0))e.push(`other ${o.slot}`);
  if(new Set(slots).size!==slots.length)e.push('slots');
  for(const s of p?.scenes??[])if(s.target&&!slots.includes(s.target))e.push(`scene ${s.no} target`);
  if(!Array.isArray(report)||report.some(r=>r.level==='error'))e.push('report');
  return e;
}
// the approver's two journals (design 7: 운영자가 합리적인 보유와 부분매도 일지를 각각 작성해 자료 충분성을 검증): each plays
// through every scene with every field of the hardest quest; one keeps everything, the other sells some
export function checkReview(p:DailyPack,review:{hold:SubDecision[];sell:SubDecision[]},now:number):string[]{
  const e:string[]=[],play=(ds:SubDecision[])=>replaySteps(p,{run:'review',quest:'q5',pack:p.id,version:p.version,day:'2000-01-01',decisions:ds},{finishedQuests:['q4'],awards:[]},now);
  for(const [k,ds] of [['hold',review?.hold],['sell',review?.sell]] as const){
    if(!Array.isArray(ds)||ds.length!==p.scenes.length){e.push(`${k}: every scene`);continue}
    const r=play(ds);if(!r.ok)e.push(`${k}: ${r.error}`)}
  if(review?.hold?.some(d=>d.fraction!=='0'))e.push('hold: sells');
  if(Array.isArray(review?.sell)&&!review.sell.some(d=>d.fraction!=='0'))e.push('sell: never sells');
  return e;
}

// a draft saved on the server (design 8 PUT draft): the writer names the revision it last saw; if another device
// saved in between, the save is refused with the latest drafts (409) and the player chooses
export type DraftDoc={drafts:Record<string,Partial<Record<'hypo'|'reason'|'counter'|'recheck'|'ev'|'target'|'period'|'dir'|'shift',string|null>>>;rev:number};
export function applyDraft(doc:DraftDoc,scene:string,fields:Record<string,unknown>,rev:number,scenes:string[]):{ok:true;doc:DraftDoc}|{ok:false;conflict:DraftDoc}|{ok:false;error:string}{
  if(!scenes.includes(scene))return {ok:false,error:'scene'};
  if(rev!==doc.rev)return {ok:false,conflict:doc};
  const t=(v:unknown)=>typeof v==='string'?v.slice(0,600):'';
  const id=(v:unknown)=>typeof v==='string'?v.slice(0,24):null;
  const f={hypo:t(fields.hypo),reason:t(fields.reason),counter:t(fields.counter),recheck:t(fields.recheck),ev:typeof fields.ev==='string'?fields.ev.slice(0,8):null,
    target:id(fields.target),period:id(fields.period),dir:id(fields.dir),shift:id(fields.shift)};
  return {ok:true,doc:{drafts:{...doc.drafts,[scene]:f},rev:doc.rev+1}};
}
