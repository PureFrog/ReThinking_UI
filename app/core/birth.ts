// W1 "내 계좌가 정원이 되는 순간" (docs/brief-wow.md): the holdings just put in are born one after another.
// Per tree: its card flies to the plot → the ground cracks with a puff of dust → the sapling shoots up to its size,
// overshoots a little and settles → its state (flowers, wilting, lean) goes on. Then the camera looks once round the
// garden and the analysts walk in. The first time is the long version; after that (and for trees added later from
// "내 종목 고치기") only the short one. Lengths live in TIMING (core/timing.ts); this file says where a moment is.
import {TIMING} from './timing';
export type BirthPhase='wait'|'card'|'crack'|'grow'|'settle'|'done';
export type BirthStage='trees'|'orbit'|'walk'|'done';
export type BirthPlan={long:boolean;n:number;stagger:number;card:number;crack:number;grow:number;settle:number;trees:number;orbitAt:number;orbit:number;walk:number;total:number};
export function birthPlan(n:number,long:boolean):BirthPlan{
  const T=TIMING;
  const card=long?T.birthCard:0,crack=long?T.birthCrack:T.birthShortCrack,grow=long?T.birthGrow:T.birthShortGrow,settle=T.birthSettle;
  // a big garden keeps the same overall length: the trees come closer together
  const stagger=n<=1?0:Math.min(long?T.birthStagger:T.birthShortStagger,(long?T.birthSpan:T.birthShortSpan)/(n-1));
  const trees=n?stagger*(n-1)+card+crack+grow+settle:0;
  // the camera starts its look round as the last tree settles
  const orbitAt=Math.max(0,trees-settle),orbit=long?T.birthOrbit:0,walk=long?T.birthWalk:0;
  return {long,n,stagger,card,crack,grow,settle,trees,orbitAt,orbit,walk,total:long?orbitAt+orbit+walk:trees};
}
// where tree i is at ms since the start: its phase and how far through it (0..1)
export function treeAt(p:BirthPlan,i:number,ms:number):{phase:BirthPhase;k:number}{
  let t=ms-i*p.stagger;if(t<0)return {phase:'wait',k:0};
  for(const [phase,len] of [['card',p.card],['crack',p.crack],['grow',p.grow],['settle',p.settle]] as const){
    if(t<len)return {phase,k:len?t/len:1};t-=len}
  return {phase:'done',k:1};
}
export function stageAt(p:BirthPlan,ms:number):BirthStage{
  if(ms>=p.total)return 'done';
  if(!p.long||ms<p.orbitAt)return 'trees';
  return ms<p.orbitAt+p.orbit?'orbit':'walk';
}
// the tree's size while it comes up: nothing until the ground cracks, then a quick rise that overshoots and settles at 1
const S=1.9;// overshoot (easeOutBack)
export const easeOutBack=(k:number)=>{const c=Math.min(1,Math.max(0,k))-1;return 1+(S+1)*c*c*c+S*c*c};
export function growScale(phase:BirthPhase,k:number){
  if(phase==='wait'||phase==='card')return 0;
  if(phase==='crack')return 0.04*k;
  if(phase==='grow')return Math.max(0.04,easeOutBack(k));
  return 1;
}
// its look (flowers, wilting, lean) goes on once it has stood up
export const stateOn=(phase:BirthPhase)=>phase==='settle'||phase==='done';
