// 관측소 원정 around the run (docs/game.md 5): which way each analyst's note leaned (kept only for the after-count, never
// shown as advice in the moment), the trust tally, the scene in my own garden that looks like a decision, the sample
// ranking until the server lands, and the headlines that came after a decision (그때 몰랐던 것).
import {fscoreOn,type GamePack,type NewsItem,type GameEvent} from './pack';
import type {Decision,Graded,Result} from './grade';
export type Who='tori'|'moa'|'luon';
export type Lean='cut'|'keep'|null;
const way=(c:Decision['choice']):Exclude<Lean,null>=>c==='지킴'?'keep':'cut';

// moa: the crash evidence by count; tori: the F-score direction; luon argues the other side of moa, or, with nothing to
// argue, points at the market (a market-wide fall leans to keeping)
export function leansOf(pack:GamePack,d:Decision):Record<Who,Lean>{
  const day=pack.days[d.tick];
  const e=pack.events.find(x=>x.d===day&&x.code===d.code&&x.kind===d.kind);
  let moa:Lean=null,tori:Lean=null;
  if(e?.kind==='crash'){const pos=e.evidence.filter(x=>x.dir==='긍정').length,neg=e.evidence.filter(x=>x.dir==='부정').length;moa=neg>pos?'cut':pos>neg?'keep':null}
  const f=e?.kind==='earnings'?{now:e.f,prev:e.prevF}:(()=>{const all=pack.fscore[d.code]??[],x=fscoreOn(pack,d.code,day),i=x?all.indexOf(x):-1;return x?{now:x.f,prev:i>0?all[i-1].f:null}:null})();
  if(f&&f.prev!==null&&f.now!==f.prev)tori=f.now<f.prev?'cut':'keep';
  const luon:Lean=moa?(moa==='cut'?'keep':'cut'):e?.kind==='crash'&&e.idx<-1?'keep':null;
  return {tori,moa,luon};
}
export type Follow={who:Who;result:Result};
// a decision that went the way an analyst leaned counts for that analyst, hit or miss
export function followsOf(pack:GamePack,items:Graded[]):Follow[]{
  return items.flatMap(g=>{const l=leansOf(pack,g);return (Object.keys(l) as Who[]).filter(w=>l[w]&&l[w]===way(g.choice)).map(w=>({who:w,result:g.result}))});
}
export function trustOf(runs:{follow?:Follow[]}[]){
  const out:Record<Who,{n:number;hit:number}>={tori:{n:0,hit:0},moa:{n:0,hit:0},luon:{n:0,hit:0}};
  for(const r of runs)for(const f of r.follow??[]){if(f.result==='tie')continue;out[f.who].n++;if(f.result==='hit')out[f.who].hit++}
  return out;
}

// a decision's shape, and the garden signal that looks like it (same model family); only the likeness is said
export type GardenSignal={holdingId:number;name:string;model:string};
export function similarOf(pack:GamePack,decisions:Decision[],garden:GardenSignal[]){
  for(const d of decisions){
    const day=pack.days[d.tick],e=pack.events.find(x=>x.d===day&&x.code===d.code&&x.kind===d.kind);if(!e)continue;
    if(e.kind==='crash'){const s=garden.find(g=>g.model==='crash');if(s)return {decision:d,signal:s,why:['급락 직후',`시장 대비 ${e.ar.toFixed(1)}%p`]}}
    if(e.kind==='earnings'&&e.prevF!==null&&e.f<e.prevF){const s=garden.find(g=>g.model==='fscore');if(s)return {decision:d,signal:s,why:['실적 발표 뒤',`F-score ${e.prevF}→${e.f}`]}}
  }
  // no exact family: any garden loss signal that came from a crash or a report
  return null;
}

// the ranking until the server (docs/game.md 5-5): steady example rows for the week's 판, always labelled as examples
const NAMES=['솔잎','이끼','자갈','개울','들꽃','부엉','도토리','물푸레','억새','반딧불','너구리','갈대','청솔','모래','안개','바위','오리','버들','노을','여울'];
export type RankRow={name:string;score:number;ret:number;me?:boolean};
export function sampleRanking(packId:string,week:string,me:{score:number;ret:number}){
  let h=0;for(const ch of packId+week)h=(h*33+ch.charCodeAt(0))>>>0;
  const rnd=()=>{h=(h*1103515245+12345)>>>0;return h/4294967296};
  const rows:RankRow[]=NAMES.map(n=>({name:'예시·'+n,score:Math.round((rnd()*2-.7)*60)*1,ret:Math.round((rnd()*2-1)*150)/10}));
  return {rows:[...rows,{name:'나',score:me.score,ret:me.ret,me:true}],sample:true};
}
export const rankBy=(rows:RankRow[],key:'score'|'ret')=>[...rows].sort((a,b)=>b[key]-a[key]||(a.me?-1:b.me?1:0));

// 그때 몰랐던 것: what came out in the 20 trading days after a decision (news in the 판, later crashes and reports)
export function afterwards(pack:GamePack,d:Decision,horizon=20):{news:NewsItem[];events:GameEvent[]}{
  const from=pack.days[d.tick],to=pack.days[Math.min(pack.days.length-1,d.tick+horizon)];
  return {news:pack.news.filter(n=>n.codes.includes(d.code)&&n.d>from&&n.d<=to),events:pack.events.filter(e=>e.code===d.code&&e.d>from&&e.d<=to)};
}
