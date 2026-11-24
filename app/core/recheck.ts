// 처분효과 (증권사 멘토링 2026-11-22, 1.7): a tree that grows with the days held rewards holding, and a loss tree the
// player has "raised" is hard to let go. So in the garden the days held change nothing a player sees on the tree:
//   the look: one grown model for every holding, its size from what the holding is worth now (core/walk.ts treeSize),
//             its leaves from the return, up and down alike (core/model.ts conditionOf; the stump only on ?treeState=1);
//   the card: what it is worth now and its share of the garden first, the days held small at the end, and the same
//             question for a gain and a loss ("if you saw it for the first time today, would you hold this much?").
// The old age-based growth (model.ts growthOf) stays only behind ?treeState=1 and in the 2D app.
import {conditionOf,defaultRules,type Holding,type Growth,type Condition} from './model';
import {treeSize,worthOf} from './walk';

export type GardenTree={growth:Growth;condition:Condition;size:number};
// how a holding stands in the 3D garden: nothing here reads h.date
export function gardenTree(h:Holding):GardenTree{
  const c=conditionOf(h,defaultRules);
  return {growth:'young',condition:c==='dead'?'wilt':c,size:treeSize(worthOf(h))};
}

export type Recheck={worth:number;weight:number;rate:number};
// the numbers the card leads with: what it is worth now and its share of the garden (%, one decimal)
export function recheck(h:Holding,all:Holding[]):Recheck{
  const worth=worthOf(h),total=all.reduce((n,x)=>n+Math.max(0,worthOf(x)),0);
  return {worth,weight:total>0?Math.round(worth/total*1000)/10:0,rate:h.rate};
}
