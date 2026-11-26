import {WON} from './won';
// 부지·건물·랜드마크 (decided 2026-11-16, docs/mockups/build.html B+C): the garden grows with coins earned by work.
// Land: plots laid out as a real farm and orchard (rows of beds) instead of scattered spots; the first 14 are free,
// more come with each piece of land opened. Buildings: farm buildings built on their lots. Landmarks: world stock-
// market cities (서울·도쿄·파리·런던·뉴욕), each standing at the garden's edge with its index named. Coins never come
// from returns or hit rates (core/ledger.ts EARN). Words: 넓히기·짓기·열기, never "사다" (buy/sell filter).
// Positions are garden x,z (app/proto3d/places.ts); the plot list is the one place tree spots come from.
// Written in the compact layout and moved out by core/world.ts (each field's plots move with the field, rows kept).
import {SPREAD,spread} from './world';

const grid=(xs:number[],zs:number[]):[number,number][]=>zs.flatMap(z=>xs.map(x=>[x,z] as [number,number]));
const FARM_GRID=grid([2.6,4.9,7.2],[-2.6,-0.2,2.2]),ORCH_GRID=grid([10.6,13,15.4],[-2.4,0.1,2.6]);
export type Land={id:string;name:string;kind:'farm'|'orchard';plots:[number,number][];price:number;at:[number,number];desc:string};
// in order: every plot index is fixed for good (a saved tree keeps its plot), base land first
const LANDS0:Land[]=[
  // 유저 워크플로우 3·4장 (PM 2026-11-21): each field starts with 9 plots (3×3) and opens 3 more with coins (9 → 12)
  {id:'farm',name:'밭',kind:'farm',plots:FARM_GRID,price:WON*0,at:[4.9,-0.2],desc:'처음부터 있는 밭'},
  {id:'orchard',name:'과수원',kind:'orchard',plots:ORCH_GRID,price:WON*0,at:[13,0.1],desc:'처음부터 있는 과수원'},
  {id:'farm2',name:'밭 넓히기',kind:'farm',plots:grid([2.6,4.9,7.2],[4.6]),price:WON*100,at:[4.9,4.6],desc:'밭 앞줄에 나무 자리 3칸 (9칸 → 12칸)'},
  {id:'orchard2',name:'과수원 넓히기',kind:'orchard',plots:grid([10.6,13,15.4],[5.1]),price:WON*150,at:[13,5.1],desc:'과수원 앞줄에 나무 자리 3칸 (9칸 → 12칸)'},
  {id:'north',name:'북쪽 밭',kind:'farm',plots:grid([3.6,6,8.4],[-5.8,-8.2]),price:WON*300,at:[6,-7],desc:'숲길 옆 새 밭, 나무 자리 6칸'},
  {id:'pondside',name:'개울가 과수원',kind:'orchard',plots:grid([6.4,8.8,11.2],[8.6,10.9]),price:WON*450,at:[8.8,9.75],desc:'개울 옆 새 과수원, 나무 자리 6칸'},
];
// 피드백 2026-11-24 (스케치 "실제 / 농부 / 가상 / 상인"): the two fields side by side across the east, seen from the middle:
// 실제 종목 밭 on the left (north), the farmer and his cart between, 가상 종목 밭 on the right (south), the merchant's shop
// past it (then 2 further back, 피드백 "뒤로 보내고"). Each opens its 3 more plots as a front row (the side toward the middle). Spread coordinates, written directly.
const col=(x:number,zs:number[]):[number,number][]=>zs.map(z=>[x,z] as [number,number]);
const FARM_Z=[-7.0,-4.7,-2.4],ORCH_Z=[2.6,5.0,7.4];
const FIELD_AT:Record<string,{plots:[number,number][];at:[number,number]}>={
  farm:{plots:[15.7,18,20.3].flatMap(x=>col(x,FARM_Z)),at:[18,-4.7]},
  farm2:{plots:col(13.4,FARM_Z),at:[13.4,-4.7]},
  orchard:{plots:[15.6,18,20.4].flatMap(x=>col(x,ORCH_Z)),at:[18,5.0]},
  orchard2:{plots:col(13.2,ORCH_Z),at:[13.2,5.0]},
};
// the 북쪽 밭 lot steps west to keep clear of 실제 종목 밭's fence
const NORTH_WEST=-2;
// a field and its extension move together (the extension's plots are the same rows)
const FIELD_OF:Record<string,string>={farm2:'farm',orchard2:'orchard'};
export const LANDS:Land[]=LANDS0.map(l=>{const f=LANDS0.find(x=>x.id===(FIELD_OF[l.id]??l.id))!,dx=(SPREAD-1)*f.at[0]+(l.id==='north'?NORTH_WEST:0),dz=(SPREAD-1)*f.at[1];
  if(FIELD_AT[l.id])return {...l,...FIELD_AT[l.id]};
  return {...l,at:[l.at[0]+dx,l.at[1]+dz],plots:l.plots.map(([x,z])=>[x+dx,z+dz] as [number,number])}});
export const BASE_LAND=['farm','orchard'];
// every plot, in index order
export const ALL_PLOTS:[number,number][]=LANDS.flatMap(l=>l.plots);
const startOf=(id:string)=>{let n=0;for(const l of LANDS){if(l.id===id)return n;n+=l.plots.length}return -1};
// the plot indices that are open with this land
export function openPlots(land:string[]):number[]{const out:number[]=[];for(const l of LANDS)if(BASE_LAND.includes(l.id)||land.includes(l.id)){const s=startOf(l.id);l.plots.forEach((_,i)=>out.push(s+i))}return out}
// 게임 구성 2026-11-20: the 밭 (farm) holds my real stocks, the 과수원 (orchard) holds virtual stocks bought with coins
export const fieldPlots=(land:string[],kind:'farm'|'orchard')=>openPlots(land).filter(i=>plotLand(i)?.kind===kind);
export const plotLand=(i:number)=>{let n=0;for(const l of LANDS){if(i<n+l.plots.length)return l;n+=l.plots.length}return null};

export type Building={id:string;name:string;price:number;at:[number,number];rot:number;desc:string};
const BUILDINGS0:Building[]=[
  {id:'greenhouse',name:'유리 온실',price:WON*150,at:[-6.6,-7.2],rot:0.4,desc:'겨울에도 초록이 남는 온실'},
  {id:'silo',name:'곡물 창고',price:WON*200,at:[14.6,8.4],rot:-0.3,desc:'과수원 옆 둥근 창고'},
  {id:'windmill',name:'풍차',price:WON*300,at:[16.6,-6],rot:-0.6,desc:'언덕 위에서 도는 풍차'},
  // 피드백 2026-11-26: 돈 주머니 (a model from the team, public/models/buildings/money_bag.glb), 500만 원
  {id:'moneybag',name:'돈 주머니',price:WON*5000,at:[-12.5,-9.5],rot:0.5,desc:'코인이 가득 담긴 커다란 돈 주머니'},
];
export const BUILDINGS:Building[]=BUILDINGS0.map(b=>({...b,at:spread(b.at[0],b.at[1])}));
export type City={id:string;city:string;landmark:string;index:string;blurb:string;price:number;at:[number,number];rot:number};
const CITIES0:City[]=[
  {id:'seoul',city:'서울',landmark:'경복궁',index:'KOSPI',blurb:'한국 대표 지수. 우리 정원의 첫 도시예요.',price:WON*120,at:[-9.5,-12.5],rot:0.5},
  {id:'tokyo',city:'도쿄',landmark:'가미나리몬',index:'닛케이225',blurb:'일본 대표 지수. 대형 수출 기업 비중이 커요.',price:WON*180,at:[-16,-5.5],rot:1.2},
  {id:'paris',city:'파리',landmark:'에펠탑',index:'CAC40',blurb:'프랑스 대표 지수. 명품·소비재 기업이 많아요.',price:WON*240,at:[17.5,-11],rot:-0.9},
  {id:'london',city:'런던',landmark:'시계탑',index:'FTSE100',blurb:'영국 대표 지수. 에너지·금융 비중이 커요.',price:WON*300,at:[9,-17],rot:-0.3},
  {id:'newyork',city:'뉴욕',landmark:'자유의 여신상',index:'S&P500',blurb:'미국 대표 지수. 500개 대형주로 시장 전체를 봐요.',price:WON*450,at:[-17.5,6],rot:1.9},
];

export const CITIES:City[]=CITIES0.map(c=>({...c,at:spread(c.at[0],c.at[1])}));

// spots: where a bought building was set down (피드백 2026-11-24 "사고 나서 마을을 보여주면서 맘에 드는 곳 클릭"); one
// without a spot stands on its lot
export type Built={land:string[];buildings:string[];cities:string[];spots?:Record<string,[number,number]>};
export const buildingAt=(b:Building,built:Built|null|undefined):[number,number]=>built?.spots?.[b.id]??b.at;
export const BUILT0:Built={land:[],buildings:[],cities:[]};
export type Want={kind:'land'|'building'|'city';id:string};
export const priceOf=(w:Want)=>w.kind==='land'?LANDS.find(l=>l.id===w.id)?.price:w.kind==='building'?BUILDINGS.find(b=>b.id===w.id)?.price:CITIES.find(c=>c.id===w.id)?.price;
const keyOf={land:'land',building:'buildings',city:'cities'} as const;
// spending: only with enough coins, only once, and land in order isn't required (any lot can be opened)
export function spend(b:Built,coins:number,w:Want,spot?:[number,number]):{ok:true;built:Built;coins:number}|{ok:false;why:'have'|'coins'|'unknown';need?:number}{
  const price=priceOf(w);if(price==null||(w.kind==='land'&&BASE_LAND.includes(w.id)))return {ok:false,why:'unknown'};
  const k=keyOf[w.kind];if(b[k].includes(w.id))return {ok:false,why:'have'};
  if(coins<price)return {ok:false,why:'coins',need:price-coins};
  const built:Built={...b,[k]:[...b[k],w.id]};if(spot&&w.kind==='building')built.spots={...b.spots,[w.id]:spot};
  return {ok:true,built,coins:coins-price};
}
