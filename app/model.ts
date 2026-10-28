import {dayKey,vitality} from './systems';
export type Holding={id:number;name:string;kind:number;price:number;quantity:number;date:string;rate:number;plot:number;lossDays:number};
export type Rules={oldDays:number;damageDays:number};
export type Decoration={id:number;name:string;color:number;x:number;y:number;w?:number;h?:number;rotation?:boolean};
export type GiftBox={id:string;sender:number;anonymous:boolean;item:string;x:number;y:number};
export const demoDate='2026-10-27';
export const defaultRules:Rules={oldDays:180,damageDays:60};
export function heldDays(date:string,now=demoDate){return Math.max(0,Math.floor((Date.parse(now)-Date.parse(date))/86400000))}
export function treeState(h:Holding,r:Rules,care:any={},now=demoDate,expiry=30){const old=heldDays(h.date,now)>=r.oldDays&&h.rate>0;const broken=h.rate<=-20&&h.lossDays>=r.damageDays;return {season:broken?'winter':h.rate< -10?'autumn':old?'old':h.rate>=10?'fruit':'green',vitality:vitality(care,now,expiry),old,broken,shrunken:!broken&&h.rate< -10,glowing:!broken&&h.rate>=10,days:heldDays(h.date,now)}}
export const initial:Holding[]=[
{id:1,name:'새봄반도체',kind:0,price:52000,quantity:12,date:'2026-08-01',rate:12.4,plot:0,lossDays:0},
{id:2,name:'별숲게임즈',kind:2,price:34000,quantity:8,date:'2025-06-01',rate:7.2,plot:2,lossDays:0},
{id:3,name:'꽃빛뷰티',kind:1,price:28000,quantity:20,date:'2026-09-01',rate:-13,plot:3,lossDays:25},
{id:4,name:'달빛스튜디오',kind:2,price:24000,quantity:10,date:'2025-12-01',rate:-24,plot:5,lossDays:90}];
export const initialGifts:GiftBox[]=[{id:'welcome-parcel',sender:2,anonymous:true,item:'포근한 담요',x:5,y:6}];
export const friends=[{name:'모아',tag:'다정한 편지 친구',greet:'잠깐 놀러 왔어. 오늘도 네 속도로 자라고 있구나.',talk:'잘 자라는 날도, 쉬는 날도 있어. 혼자 서두르지 않았으면 좋겠어.',bye:'차 고마워! 다음에 또 놀러 올게.',item:'위로 사탕',anonymous:false},
{name:'토리',tag:'씩씩한 정원 친구',greet:'왔데이! 정원 구경 좀 해도 되나? 오늘 햇살 참 좋다!',talk:'급하게 결론 내리지 말고, 근거부터 하나씩 같이 보자. 내도 옆에 있을게!',bye:'내 또 놀러 올게! 나무 잘 보고 있그래이!',item:'여름 선글라스',anonymous:false},
{name:'루온',tag:'조용히 챙겨주는 친구',greet:'…근처에 왔다가. 잠깐 들렀어.',talk:'문 앞 상자? …글쎄. 누가 두고 갔나 보지. 따뜻하게 지내.',bye:'가볼게. …문 앞도 한번 보고.',item:'작은 별 조명',anonymous:true}];
export function route(start:{x:number;y:number},goal:{x:number;y:number},blocked:Set<string>,near=false){
 const key=(x:number,y:number)=>`${x},${y}`;const valid=(x:number,y:number)=>x>=0&&x<=16&&y>=0&&y<=14&&!blocked.has(key(x,y));
 let goals=near?[[goal.x-1,goal.y],[goal.x+1,goal.y],[goal.x,goal.y-1],[goal.x,goal.y+1]]:[[goal.x,goal.y]];goals=goals.filter(([x,y])=>valid(x,y));if(!goals.length)return null;
 const queue=[start],seen=new Set([key(start.x,start.y)]),prev=new Map<string,{x:number;y:number}>();let end:{x:number;y:number}|undefined;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(goals.some(([x,y])=>x===p.x&&y===p.y)){end=p;break}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:p.x+dx,y:p.y+dy},k=key(n.x,n.y);if(valid(n.x,n.y)&&!seen.has(k)){seen.add(k);prev.set(k,p);queue.push(n)}}}
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
 return {bubbleX,bubbleY:Math.max(0,py-height*.14),choiceX,choiceY:Math.max(0,py-height*.02),bubbleWidth,choicesWidth};
}
export function giftPosition(gifts:GiftBox[],claimed:string[]){
 const occupied=new Set(gifts.filter(g=>!claimed.includes(g.id)).map(g=>`${g.x},${g.y}`));
 return [{x:6,y:7},{x:4,y:7},{x:5,y:8},{x:6,y:8},{x:4,y:8}].find(p=>!occupied.has(`${p.x},${p.y}`))??null;
}
export function subject(name:string){const code=name.charCodeAt(name.length-1)-0xac00;return name+(code>=0&&code<=11171&&code%28!==0?'이':'가')}
