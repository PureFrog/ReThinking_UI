// 다른 정원들 (docs/planets.md): each player's garden as a small planet in the sky. A planet carries only what its owner
// lets out (share): never amounts, quantities, returns, judgment notes or captures. 'hide' (the default) shows tree
// states, sectors and the judging numbers; 'open' adds the company names; 'off' keeps the planet out of the sky.
import {conditionOf,type Holding,type Rules,type Condition} from './model';
export type Share='off'|'hide'|'open';
export const SHARE_LABEL:Record<Share,string>={off:'비공개',hide:'이름 가림',open:'종목 공개'};
// the tree on a planet: its look (condition), its sector, and its name only when the owner opened them
export type PlanetTree={condition:Condition;sector:string;name?:string};
export type Planet={id:string;name:string;rank:string;habit:string;color:string;hit:number|null;calibration:number|null;best:number|null;stamps:number;trees:PlanetTree[];share:Share;me?:boolean;sample?:boolean};
// the three tree kinds the garden draws (content/portfolio.ts kindOf) read as broad sectors
export const SECTOR_OF_KIND=['기술·부품','소비재','콘텐츠'];
export type PlanetCtx={name:string;rank:string;habit:string;color:string;hit:number|null;calibration:number|null;best:number|null;stamps:number};
// my planet as others would get it; null when I keep it private
export function myPlanet(holdings:Holding[],rules:Rules,share:Share,c:PlanetCtx):Planet|null{
  if(share==='off')return null;
  const trees=holdings.map(h=>({condition:conditionOf(h,rules),sector:SECTOR_OF_KIND[h.kind%SECTOR_OF_KIND.length],...(share==='open'?{name:h.name}:{})}));
  return {id:'me',name:c.name||'나',rank:c.rank,habit:c.habit,color:c.color,hit:c.hit,calibration:c.calibration,best:c.best,stamps:c.stamps,trees,share,me:true};
}
// what may leave the device: a planet with nothing else in it (the server stores exactly this)
export function wireOf(p:Planet){
  return {name:p.name,rank:p.rank,habit:p.habit,color:p.color,hit:p.hit,calibration:p.calibration,best:p.best,stamps:p.stamps,share:p.share,
    trees:p.trees.map(t=>p.share==='open'&&t.name?{condition:t.condition,sector:t.sector,name:t.name}:{condition:t.condition,sector:t.sector})};
}
// example neighbours until the server: steady for a week, always marked as examples
const NEIGHBOURS:[string,string,string,string][]=[
  ['북쪽창','수석 애널리스트','지켜봄 위주','#36557e'],['느린복기','애널리스트','홀드 위주','#7a5238'],['공시러','주니어 애널리스트','고르게','#c4652e'],
  ['현금비중','애널리스트','손절 검토 위주','#4d4a8a'],['추세선','주니어 애널리스트','고르게','#9c6c12'],['분기노트','수석 애널리스트','홀드 위주','#1e6b4a'],['오후3시','시니어 애널리스트','지켜봄 위주','#6a5aa8'],
];
const SECTORS=['반도체 장비','2차전지 소재','게임','바이오','조선','화장품','유통','통신','건설','철강','은행','보험','미디어','엔터','자동차 부품','음식료'];
const NAMES=['한빛유통','청솔텔레콤','바위건설','POSCO홀딩스','SK하이닉스','NAVER'];
const CONDS:Condition[]=['bloom','well','well','dull','wilt','rot'];
export function examplePlanets(week:string):Planet[]{
  let h=0;for(const ch of week)h=(h*31+ch.charCodeAt(0))>>>0;const rnd=()=>{h=(h*1103515245+12345)>>>0;return h/4294967296};
  return NEIGHBOURS.map(([name,rank,habit,color],i)=>{const n=3+Math.floor(rnd()*5),open=i===1;
    return {id:'ex'+i,name,rank,habit,color,hit:40+Math.round(rnd()*35),calibration:55+Math.round(rnd()*35),best:Math.round((rnd()*9-2))*10,stamps:2+Math.floor(rnd()*11),
      trees:Array.from({length:n},(_,k)=>({condition:CONDS[Math.floor(rnd()*CONDS.length)],sector:SECTORS[Math.floor(rnd()*SECTORS.length)],...(open?{name:NAMES[k%NAMES.length]}:{})})),
      share:open?'open':'hide',sample:true}});
}
export const CONDITION_COLOR:Record<Condition,string>={bloom:'#d98aa0',well:'#5f8a45',dull:'#c9a03c',wilt:'#9b6a3c',rot:'#6e5a3c',dead:'#5a4e44'};
export const CONDITION_SHORT:Record<Condition,string>={bloom:'꽃 핌',well:'튼튼',dull:'신호 있음',wilt:'시듦',rot:'썩어 감',dead:'그루터기'};
