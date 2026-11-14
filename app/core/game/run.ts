// One run through a 판 (docs/game.md 3·5): the decision moments, the chips, the swap after a 정리, the orders a choice
// turns into, and the three paths shown at the reveal (mine, doing nothing, following only the crash model).
import {barAt,closeBefore,type GamePack,type GameEvent,type GameCompany} from './pack';
import {simulate,returnOf,type Order} from './engine';
import type {Choice,Decision} from './grade';
import {weekStart} from '../weekly';
export const CHIPS=10,MAX_STAKE=4;

export const canStake=(left:number,n:number)=>Number.isInteger(n)&&n>=1&&n<=MAX_STAKE&&n<=left;
export const chipsLeft=(decisions:{chips:number}[])=>CHIPS-decisions.reduce((s,d)=>s+d.chips,0);

// the moments that stop time: crash days and report days of companies held right then
export function moments(pack:GamePack,heldOn:(code:string,tick:number)=>boolean):(GameEvent&{tick:number})[]{
  return pack.events.map(e=>({...e,tick:pack.days.indexOf(e.d)})).filter(e=>e.tick>=0&&heldOn(e.code,e.tick)).sort((a,b)=>a.tick-b.tick);
}
// held at a tick, given the swaps made so far (a 정리 at tick t drops the company from t+1 and brings its replacement in)
export type Swap={tick:number;out:string;in:string};
export function heldAt(pack:GamePack,swaps:Swap[],code:string,tick:number){
  const c=pack.companies.find(x=>x.code===code);if(!c)return false;
  const out=swaps.find(s=>s.out===code),inn=swaps.find(s=>s.in===code);
  if(out&&tick>out.tick)return false;
  if(c.start==='held')return true;
  return !!inn&&tick>inn.tick;
}
// the replacement after a 정리: a waiting company, picked steadily from the run's seed (same seed → same company)
export function pickReplacement(pack:GamePack,used:string[],seed:number):GameCompany|null{
  const pool=pack.companies.filter(c=>c.start==='reserve'&&!used.includes(c.code));
  if(!pool.length)return null;
  return pool[Math.abs(Math.floor(seed))%pool.length];
}

// a decision as orders on its tick: 정리 sells all, 절반 sells half; a swap buys the newcomer with what the sale brought
export function ordersFor(pack:GamePack,d:{tick:number;code:string;choice:Choice},qtyHeld:number,seq:number,swapIn?:string):Order[]{
  const qty=d.choice==='정리'?qtyHeld:d.choice==='절반'?Math.floor(qtyHeld/2):0;
  if(qty<=0)return [];
  const out:Order[]=[{seq,tick:d.tick,code:d.code,side:'sell',qty}];
  if(swapIn&&d.choice==='정리'){
    const o=barAt(pack,d.code,d.tick+1)?.[1]??closeBefore(pack,d.code),p=barAt(pack,swapIn,d.tick+1)?.[1]??0;
    if(p>0)out.push({seq:seq+1,tick:d.tick,code:swapIn,side:'buy',qty:Math.floor(qty*o*.998/p)});
  }
  return out;
}

// the three paths at the reveal
export function paths(pack:GamePack,myOrders:Order[]){
  const me=returnOf(simulate(pack,myOrders));
  const none=returnOf(simulate(pack,[]));
  const start=Object.fromEntries(pack.companies.filter(c=>c.start==='held').map(c=>[c.code,c.qty]));
  const model:Order[]=[];let seq=0;const sold=new Set<string>();
  for(const e of [...pack.events].sort((a,b)=>a.d<b.d?-1:1)){
    if(e.kind!=='crash'||e.verdict!=='가치훼손'||!start[e.code]||sold.has(e.code))continue;
    const tick=pack.days.indexOf(e.d);if(tick<0)continue;
    model.push({seq:seq++,tick,code:e.code,side:'sell',qty:start[e.code]});sold.add(e.code);
  }
  return {me,none,model:returnOf(simulate(pack,model))};
}

// this week's shared 판: the same for everyone, changes on Monday (KST), cycles through the list
export function weeklyPack(ids:string[],today:string){
  if(!ids.length)return null;
  const n=Math.round(Date.parse(weekStart(today)+'T00:00:00Z')/(7*86400000));
  return ids[((n%ids.length)+ids.length)%ids.length];
}
// hits, ret (my return %) and follow (whose lean each decision went with, core/game/meta.ts) came in G4; old saves lack them
export type RunRecord={pack:string;week:string;decisions:Decision[];total:number;at:string;hits?:number;ret?:number;follow?:{who:'tori'|'moa'|'luon';result:'hit'|'miss'|'tie'}[];results?:('hit'|'miss'|'tie')[]};
// "the past me": the last run of the same 판, its decisions laid over the chart
export function ghostOf(history:RunRecord[],packId:string,exceptAt?:string){
  const prev=history.filter(r=>r.pack===packId&&r.at!==exceptAt).sort((a,b)=>a.at<b.at?1:-1);
  return prev[0]??null;
}
