// The run as a small state machine the screen drives (docs/game.md 3): brief → flow (a day at a time) → moment (time
// stops on a crash or report day of a company held right then) → flow … → reveal. Pure: the screen keeps the state and
// calls these; the same pack, seed and choices always give the same run.
import {barAt,type GamePack,type GameEvent} from './pack';
import {simulate,type Order} from './engine';
import {canStake,chipsLeft,heldAt,moments,ordersFor,pickReplacement,type Swap} from './run';
import type {Choice,Decision} from './grade';
export const ROOMS=3,MAX_PINS=3;
export type Phase='brief'|'flow'|'moment'|'reveal';
export type Moment=GameEvent&{tick:number};
export type Play={pack:string;seed:number;phase:Phase;tick:number;decisions:Decision[];swaps:Swap[];orders:Order[];pins:string[];moment:Moment|null};

export const startPlay=(pack:GamePack,seed:number):Play=>({pack:pack.id,seed,phase:'brief',tick:-1,decisions:[],swaps:[],orders:[],pins:[],moment:null});
export const begin=(p:Play):Play=>p.phase==='brief'?{...p,phase:'flow',tick:0}:p;
export const held=(pack:GamePack,p:Play,code:string,tick=p.tick)=>heldAt(pack,p.swaps,code,tick);
export const heldCodes=(pack:GamePack,p:Play,tick=p.tick)=>pack.companies.filter(c=>held(pack,p,c.code,Math.max(0,tick))).map(c=>c.code);
// the moment waiting on this tick (one at a time; a company already decided that day is not asked twice)
export function momentAt(pack:GamePack,p:Play,tick=p.tick):Moment|null{
  // a company sold down to nothing by my own trades has no moment left to ask about
  return moments(pack,(c,t)=>held(pack,p,c,t)).find(m=>m.tick===tick&&!p.decisions.some(d=>d.tick===tick&&d.code===m.code)&&simulate(pack,p.orders,tick).positions[m.code]!==undefined)??null;
}
// one trading day on; stops when a moment comes up, ends at the last day
export function step(pack:GamePack,p:Play):Play{
  if(p.phase!=='flow')return p;
  const m=momentAt(pack,p);if(m)return {...p,phase:'moment',moment:m};
  if(p.tick>=pack.days.length-1)return {...p,phase:'reveal',moment:null};
  const next={...p,tick:p.tick+1};
  const m2=momentAt(pack,next);
  return m2?{...next,phase:'moment',moment:m2}:next;
}
// jump straight to the next moment (or the end)
export function skipToMoment(pack:GamePack,p:Play):Play{let q=p;for(let i=0;i<=pack.days.length&&q.phase==='flow';i++)q=step(pack,q);return q}
export const qtyHeld=(pack:GamePack,p:Play,code:string)=>simulate(pack,p.orders,Math.max(0,p.tick)).positions[code]?.qty??0;
// a decision on the moment: orders for the next open, a swap after a 정리, then time runs again
export function decide(pack:GamePack,p:Play,choice:Choice,chips:number):Play{
  const m=p.moment;if(p.phase!=='moment'||!m||!canStake(chipsLeft(p.decisions),chips))return p;
  const qty=qtyHeld(pack,p,m.code);
  let swaps=p.swaps,swapIn:string|undefined;
  if(choice==='정리'){const used=[...pack.companies.filter(c=>c.start==='held').map(c=>c.code),...p.swaps.map(s=>s.in)];
    const r=pickReplacement(pack,used,p.seed+p.decisions.length);if(r){swapIn=r.code;swaps=[...swaps,{tick:m.tick,out:m.code,in:r.code}]}}
  const orders=[...p.orders,...ordersFor(pack,{tick:m.tick,code:m.code,choice},qty,p.orders.length,swapIn)];
  const decision:Decision={tick:m.tick,code:m.code,choice,chips,kind:m.kind};
  const next:Play={...p,phase:'flow',moment:null,decisions:[...p.decisions,decision],swaps,orders};
  const again=momentAt(pack,next);// another company on the same day
  return again?{...next,phase:'moment',moment:again}:next;
}
// a trade of my own during the flow (docs/game.md 3): fills at the next open like any order; it moves the returns,
// not the judgment score
export function trade(pack:GamePack,p:Play,code:string,side:'buy'|'sell',qty:number):Play{
  if(p.phase!=='flow'||qty<=0||!held(pack,p,code))return p;
  return {...p,orders:[...p.orders,{seq:p.orders.length,tick:p.tick,code,side,qty:Math.floor(qty)}]};
}
export const togglePin=(p:Play,url:string):Play=>p.pins.includes(url)?{...p,pins:p.pins.filter(u=>u!==url)}:p.pins.length>=MAX_PINS?p:{...p,pins:[...p.pins,url]};
export const roomOf=(pack:GamePack,tick:number)=>Math.min(ROOMS-1,Math.floor(Math.max(0,tick)/Math.ceil(pack.days.length/ROOMS)));
export const dayChange=(pack:GamePack,code:string,tick:number)=>{const b=barAt(pack,code,tick),a=barAt(pack,code,tick-1);return b&&a?(b[4]/a[4]-1)*100:0};
export const seedOf=(packId:string,n:number)=>{let h=7;for(const ch of packId)h=(h*31+ch.charCodeAt(0))>>>0;return (h+n*977)%100000};
