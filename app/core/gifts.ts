// ux-spec 3장 gifts both ways. A friend brings one gift a day: its own first gift, then the new ones each stage opens,
// then (when it has one) a small thing it brings again. The player can give a friend anything from the drawer;
// the friend loves it, thanks for it, or is a little awkward about it, and has it on the next visit.
import type {GiftBox} from './model';
import {POINTS} from './relationships';
export type Reaction='loved'|'thanks'|'awkward';
// stage: the closeness stage that opens it · again: brought again once everything new is given
export type PoolGift={item:string;stage:number;again?:boolean};
export const GIFT_POOL:Record<string,PoolGift[]>={
 moa:[{item:'위로 사탕',stage:0,again:true},{item:'산딸기 잼',stage:1,again:true},{item:'털실 바구니',stage:2},{item:'말린 꽃 액자',stage:3}],
 tori:[{item:'여름 선글라스',stage:0},{item:'들꽃 화병',stage:1},{item:'별 모양 조약돌',stage:2},{item:'도토리 새싹 화분',stage:3}],
 luon:[{item:'작은 별 조명',stage:0},{item:'따뜻한 보리차',stage:1,again:true},{item:'작은 나무 상자',stage:2},{item:'별자리 모빌',stage:3}],
};
// what each friend likes (ux-spec 3장 table): moa flowers, letters, warm tea · tori acorns, berries, little boxes ·
// luon star things, yarn, a quiet seat
export const LIKES:Record<string,string[]>={
 moa:['들꽃 화병','말린 꽃 액자','따뜻한 보리차','첫 일지 액자'],
 tori:['산딸기 잼','작은 나무 상자','도토리 새싹 화분','위로 사탕'],
 luon:['작은 별 조명','별 모양 조약돌','별자리 모빌','털실 바구니','포근한 담요'],
};
export const DISLIKES:Record<string,string[]>={luon:['여름 선글라스']};
export const GIFT_POINTS:Record<Reaction,number>={loved:POINTS.story,thanks:2,awkward:1};

const sameDay=(g:GiftBox,day:string)=>g.day===day;
// The gift this friend brings on arriving today, or null (one a day, ach- milestones aside).
export function visitGift(friendId:string,stage:number,gifts:GiftBox[],day:string):{id:string;item:string}|null{
 const pool=GIFT_POOL[friendId];if(!pool)return null;
 const mine=gifts.filter(g=>g.sender===friendId&&g.id.startsWith('visit-'));if(mine.some(g=>sameDay(g,day)))return null;
 const open=pool.filter(p=>p.stage<=stage);
 // the very first one keeps its old id, so older saves do not get it twice
 const first=open[0]&&!gifts.some(g=>g.id==='visit-'+friendId)?open[0]:null;
 const next=first??open.find(p=>!mine.some(g=>g.item===p.item))??open.filter(p=>p.again).sort((a,b)=>mine.filter(g=>g.item===a.item).length-mine.filter(g=>g.item===b.item).length)[0];
 if(!next)return null;return {id:first?'visit-'+friendId:`visit-${friendId}-${day}`,item:next.item}}

// returned: the friend gets back something it gave
export function reactionTo(friendId:string,gift:GiftBox):{reaction:Reaction;returned:boolean}{
 const returned=gift.sender===friendId;
 if(returned||DISLIKES[friendId]?.includes(gift.item))return {reaction:'awkward',returned};
 return {reaction:LIKES[friendId]?.includes(gift.item)?'loved':'thanks',returned:false}}

// A gift the player gave: the friend has it on its next visits (the latest one given).
export type Given={giftId:string;to:string;item:string;day:string;reaction:Reaction;visit:number};
export function holding(given:Given[],friendId:string,visit:number){return [...given].reverse().find(g=>g.to===friendId&&g.visit<visit)?.item??null}
