// code: the KRX code when known (지기 journal charts and grading, app/core/jigi/stocks.ts)
// real: on real prices (core/real.ts): price is the real close on `date`, rate and lossDays follow the latest close (asOf)
export type Holding={id:number;name:string;code?:string;kind:number;price:number;quantity:number;date:string;rate:number;plot:number;lossDays:number;real?:boolean;asOf?:string};
// vitalityDays: no journal for this long switches a tree's vitality off (ux-spec 2장, app/core/vitality.ts)
export type Rules={oldDays:number;damageDays:number;vitalityDays?:number};
// flip: turned the other way (11.9, the picture mirrored) · on: a lamp switched on
export type Decoration={id:number;name:string;color:number;x:number;y:number;flip?:boolean;on?:boolean};
// day: when a friend brought it (one a day, app/core/gifts.ts)
export type GiftBox={id:string;sender:string;anonymous:boolean;item:string;x:number;y:number;day?:string};
export const demoDate='2026-10-27';
export const defaultRules:Rules={oldDays:180,damageDays:60,vitalityDays:30};
// held days count to the demo's fixed day, or to today for a holding on real prices
export const realToday=()=>new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
export function heldDays(date:string,asOf=demoDate){return Math.max(0,Math.floor((Date.parse(asOf)-Date.parse(date))/86400000))}
// Growth follows holding time; condition follows the mock return (and how long a deep loss lasted).
// The thresholds stay the old ones: +10% inclusive glows, below -10% wilts, -20% or worse for damageDays is dead.
export const GROWTH=['seed','sprout','sapling','young','grand'] as const;
export const GROWTH_NAMES={seed:'씨앗',sprout:'새싹',sapling:'어린 나무',young:'자란 나무',grand:'큰 나무'};
export const GROWTH_DAYS=[0,7,30,90];// grand from rules.oldDays
export const CONDITIONS=['bloom','well','dull','wilt','rot','dead'] as const;
export const CONDITION_NAMES={bloom:'열매가 빛남',well:'싱싱함',dull:'잎끝이 누레짐',wilt:'시들어 잎이 떨어짐',rot:'가지가 썩어 감',dead:'말라 죽은 그루터기'};
export type Growth=typeof GROWTH[number];export type Condition=typeof CONDITIONS[number];
export function growthOf(days:number,r:Rules):Growth{return days>=r.oldDays?'grand':GROWTH[GROWTH_DAYS.filter(d=>days>=d).length-1]}
export function conditionOf(h:Holding,r:Rules):Condition{
 if(h.rate>=10)return 'bloom';if(h.rate>=0)return 'well';if(h.rate>=-10)return 'dull';
 if(h.rate<=-20&&h.lossDays>=r.damageDays)return 'dead';if(h.rate<=-20&&h.lossDays>=r.damageDays/2)return 'rot';return 'wilt'}
export function treeState(h:Holding,r:Rules){const days=heldDays(h.date,h.real?realToday():demoDate),growth=growthOf(days,r),condition=conditionOf(h,r);const old=days>=r.oldDays&&h.rate>0;const broken=condition==='dead';return {old,broken,shrunken:!broken&&h.rate< -10,glowing:condition==='bloom',days,growth,condition}}
export const initial:Holding[]=[
{id:1,name:'SK하이닉스',kind:0,price:52000,quantity:12,date:'2026-08-01',rate:12.4,plot:0,lossDays:0},
{id:2,name:'NAVER',kind:2,price:34000,quantity:8,date:'2025-06-01',rate:7.2,plot:2,lossDays:0},
{id:3,name:'카카오',kind:1,price:28000,quantity:20,date:'2026-09-01',rate:-13,plot:3,lossDays:25},
{id:4,name:'현대차',kind:2,price:24000,quantity:10,date:'2025-12-01',rate:-24,plot:5,lossDays:90}];
export const initialGifts:GiftBox[]=[{id:'welcome-parcel',sender:'luon',anonymous:true,item:'포근한 담요',x:5,y:6}];
// Friends live in app/content/friends.ts (registry by id).
// wall(a,b): true when the step from a to its neighbour b goes through a wall (the house walls, 13.7-5).
export function route(start:{x:number;y:number},goal:{x:number;y:number},blocked:Set<string>,near=false,inMap:(x:number,y:number)=>boolean=(x,y)=>x>=0&&x<=16&&y>=0&&y<=14,wall:(a:{x:number;y:number},b:{x:number;y:number})=>boolean=()=>false){
 const key=(x:number,y:number)=>`${x},${y}`;const valid=(x:number,y:number)=>inMap(x,y)&&!blocked.has(key(x,y));
 let goals=near?[[goal.x-1,goal.y],[goal.x+1,goal.y],[goal.x,goal.y-1],[goal.x,goal.y+1]]:[[goal.x,goal.y]];goals=goals.filter(([x,y])=>valid(x,y)&&!wall({x,y},goal));if(!goals.length)return null;
 const queue=[start],seen=new Set([key(start.x,start.y)]),prev=new Map<string,{x:number;y:number}>();let end:{x:number;y:number}|undefined;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(goals.some(([x,y])=>x===p.x&&y===p.y)){end=p;break}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:p.x+dx,y:p.y+dy},k=key(n.x,n.y);if(valid(n.x,n.y)&&!seen.has(k)&&!wall(p,n)){seen.add(k);prev.set(k,p);queue.push(n)}}}
 if(!end)return null;const path=[];let p=end;while(p.x!==start.x||p.y!==start.y){path.unshift(p);p=prev.get(key(p.x,p.y))!}return path;
}

// Only the latest uncancelled action may commit a furniture change.
export class ActionGate {
 private revision=0;
 active=false;
 begin(){this.active=true;return ++this.revision}
 cancel(){this.active=false;++this.revision}
 complete(token:number){if(!this.active||token!==this.revision)return false;this.active=false;return true}
}
export function dialogueLayout(x:number,y:number,width:number,height:number){
 const bubbleWidth=Math.min(width-24,width<600?185:240),choicesWidth=Math.min(width-24,width<600?170:205);
 const px=x/100*width,py=y/100*height;
 const bubbleX=Math.max(bubbleWidth/2+12,Math.min(width-bubbleWidth/2-12,px));
 const right=px+width*.06;const choiceX=right+choicesWidth<=width-12?right:Math.max(12,px-width*.06-choicesWidth);
 // The bubble is pushed inward at the edges; the tail keeps pointing at the speaker.
 const tailX=Math.max(-bubbleWidth/2+18,Math.min(bubbleWidth/2-18,px-bubbleX));
 return {bubbleX,bubbleY:Math.max(0,py-height*.12),choiceX,choiceY:Math.max(0,py-height*.02),bubbleWidth,choicesWidth,tailX};
}
// Spots for boxes friends bring, around the front door but never on its outside cell (5,8), and filled so the door's
// inside cell (5,7) keeps a way through while the welcome parcel (5,6) is still there.
export function giftPosition(gifts:GiftBox[],claimed:string[]){
 const occupied=new Set(gifts.filter(g=>!claimed.includes(g.id)).map(g=>`${g.x},${g.y}`));
 return [{x:6,y:7},{x:6,y:8},{x:4,y:8},{x:4,y:7}].find(p=>!occupied.has(`${p.x},${p.y}`))??null;
}
export function subject(name:string){const code=name.charCodeAt(name.length-1)-0xac00;return name+(code>=0&&code<=11171&&code%28!==0?'이':'가')}
