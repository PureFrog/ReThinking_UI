// Fishing with 나루 at the pond (feedback 11-17, docs/mockups/otter-fishing.html). A cast waits a while, the float
// dips, a tap inside the dip's window lands the fish; too early scares it off, too late it has gone. Three casts a day
// (the master account: no limit). Coins are small and only for catching. All the numbers live here.
import {FISH,fishById,type Fish,type Rarity} from '../content/fish';

export const FISHING={perDay:3,biteMin:1500,biteMax:5200/* ms after the cast before the dip */,window:650/* ms the dip lasts */,
  rarity:{'보통':0.78,'희귀':0.19,'전설':0.03} as Record<Rarity,number>,coins:{'보통':1,'희귀':3,'전설':10} as Record<Rarity,number>,firstBonus:2};
export type FishLog=Record<string,{n:number;best:number}>;
export type Fishing={day:string;casts:number;log:FishLog};
export const blankFishing=():Fishing=>({day:'',casts:0,log:{}});

export function castsLeft(f:Fishing|undefined,today:string,unlimited=false){if(unlimited)return 99;const used=f&&f.day===today?f.casts:0;return Math.max(0,FISHING.perDay-used)}
// rng: 0..1 (Math.random in the app, fixed in tests)
export function biteAfter(rng:()=>number){return Math.round(FISHING.biteMin+rng()*(FISHING.biteMax-FISHING.biteMin))}
export function pickFish(rng:()=>number):{fish:Fish;size:number}{
  const r=rng();const rarity:Rarity=r<FISHING.rarity['전설']?'전설':r<FISHING.rarity['전설']+FISHING.rarity['희귀']?'희귀':'보통';
  const pool=FISH.filter(f=>f.rarity===rarity),total=pool.reduce((s,f)=>s+f.weight,0);let x=rng()*total,fish=pool[0];
  for(const f of pool){x-=f.weight;if(x<=0){fish=f;break}}
  const size=Math.round((fish.min+rng()*(fish.max-fish.min))*10)/10;return {fish,size};
}
// a tap at `at` ms after the cast, the dip at `bite`: early (scared off), caught, or late (gone)
export function judgeTap(at:number,bite:number,window=FISHING.window):'early'|'caught'|'late'{return at<bite?'early':at<=bite+window?'caught':'late'}
// a cast used (whatever came of it)
export function useCast(f:Fishing|undefined,today:string):Fishing{const b=f??blankFishing();return b.day===today?{...b,casts:b.casts+1}:{...b,day:today,casts:1}}
// a fish landed: into the log, and what it pays
export function land(f:Fishing|undefined,id:string,size:number):{fishing:Fishing;coins:number;first:boolean;best:boolean}{
  const b=f??blankFishing(),fish=fishById(id);if(!fish)return {fishing:b,coins:0,first:false,best:false};
  const was=b.log[id],first=!was,best=!was||size>was.best;
  const log={...b.log,[id]:{n:(was?.n??0)+1,best:Math.max(was?.best??0,size)}};
  return {fishing:{...b,log},coins:FISHING.coins[fish.rarity]+(first?FISHING.firstBonus:0),first,best};
}
export const caughtKinds=(f:Fishing|undefined)=>Object.keys(f?.log??{}).length;
