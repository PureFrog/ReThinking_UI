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
  {id:'farm',name:'밭',kind:'farm',plots:FARM_GRID.slice(0,7),price:0,at:[4.9,-0.2],desc:'처음부터 있는 밭'},
  {id:'orchard',name:'과수원',kind:'orchard',plots:ORCH_GRID.slice(0,7),price:0,at:[13,0.1],desc:'처음부터 있는 과수원'},
  {id:'farm2',name:'밭 넓히기',kind:'farm',plots:FARM_GRID.slice(7),price:20,at:[6.05,2.2],desc:'밭 끝줄에 나무 자리 2칸'},
  {id:'orchard2',name:'과수원 넓히기',kind:'orchard',plots:ORCH_GRID.slice(7),price:35,at:[14.2,2.6],desc:'과수원 끝줄에 나무 자리 2칸'},
  {id:'north',name:'북쪽 밭',kind:'farm',plots:grid([3.6,6,8.4],[-5.8,-8.2]),price:60,at:[6,-7],desc:'숲길 옆 새 밭, 나무 자리 6칸'},
  {id:'pondside',name:'연못가 과수원',kind:'orchard',plots:grid([6.4,8.8,11.2],[7.2,9.6]),price:90,at:[8.8,8.4],desc:'연못 건너 새 과수원, 나무 자리 6칸'},
];
// a field and its extension move together (the extension's plots are the same rows)
const FIELD_OF:Record<string,string>={farm2:'farm',orchard2:'orchard'};
export const LANDS:Land[]=LANDS0.map(l=>{const f=LANDS0.find(x=>x.id===(FIELD_OF[l.id]??l.id))!,dx=(SPREAD-1)*f.at[0],dz=(SPREAD-1)*f.at[1];
  return {...l,at:[l.at[0]+dx,l.at[1]+dz],plots:l.plots.map(([x,z])=>[x+dx,z+dz] as [number,number])}});
export const BASE_LAND=['farm','orchard'];
// every plot, in index order
export const ALL_PLOTS:[number,number][]=LANDS.flatMap(l=>l.plots);
const startOf=(id:string)=>{let n=0;for(const l of LANDS){if(l.id===id)return n;n+=l.plots.length}return -1};
// the plot indices that are open with this land
export function openPlots(land:string[]):number[]{const out:number[]=[];for(const l of LANDS)if(BASE_LAND.includes(l.id)||land.includes(l.id)){const s=startOf(l.id);l.plots.forEach((_,i)=>out.push(s+i))}return out}
export const plotLand=(i:number)=>{let n=0;for(const l of LANDS){if(i<n+l.plots.length)return l;n+=l.plots.length}return null};

export type Building={id:string;name:string;price:number;at:[number,number];rot:number;desc:string};
const BUILDINGS0:Building[]=[
  {id:'greenhouse',name:'유리 온실',price:30,at:[-6.6,-7.2],rot:0.4,desc:'겨울에도 초록이 남는 온실'},
  {id:'silo',name:'곡물 창고',price:40,at:[14.6,8.4],rot:-0.3,desc:'과수원 옆 둥근 창고'},
  {id:'windmill',name:'풍차',price:55,at:[16.6,-6],rot:-0.6,desc:'언덕 위에서 도는 풍차'},
];
export const BUILDINGS:Building[]=BUILDINGS0.map(b=>({...b,at:spread(b.at[0],b.at[1])}));
export type City={id:string;city:string;landmark:string;index:string;blurb:string;price:number;at:[number,number];rot:number};
const CITIES0:City[]=[
  {id:'seoul',city:'서울',landmark:'경복궁',index:'KOSPI',blurb:'한국 대표 지수. 우리 정원의 첫 도시예요.',price:40,at:[-9.5,-12.5],rot:0.5},
  {id:'tokyo',city:'도쿄',landmark:'가미나리몬',index:'닛케이225',blurb:'일본 대표 지수. 대형 수출 기업 비중이 커요.',price:60,at:[-16,-5.5],rot:1.2},
  {id:'paris',city:'파리',landmark:'에펠탑',index:'CAC40',blurb:'프랑스 대표 지수. 명품·소비재 기업이 많아요.',price:80,at:[17.5,-11],rot:-0.9},
  {id:'london',city:'런던',landmark:'시계탑',index:'FTSE100',blurb:'영국 대표 지수. 에너지·금융 비중이 커요.',price:100,at:[9,-17],rot:-0.3},
  {id:'newyork',city:'뉴욕',landmark:'자유의 여신상',index:'S&P500',blurb:'미국 대표 지수. 500개 대형주로 시장 전체를 봐요.',price:150,at:[-17.5,6],rot:1.9},
];

export const CITIES:City[]=CITIES0.map(c=>({...c,at:spread(c.at[0],c.at[1])}));

export type Built={land:string[];buildings:string[];cities:string[]};
export const BUILT0:Built={land:[],buildings:[],cities:[]};
export type Want={kind:'land'|'building'|'city';id:string};
export const priceOf=(w:Want)=>w.kind==='land'?LANDS.find(l=>l.id===w.id)?.price:w.kind==='building'?BUILDINGS.find(b=>b.id===w.id)?.price:CITIES.find(c=>c.id===w.id)?.price;
const keyOf={land:'land',building:'buildings',city:'cities'} as const;
// spending: only with enough coins, only once, and land in order isn't required (any lot can be opened)
export function spend(b:Built,coins:number,w:Want):{ok:true;built:Built;coins:number}|{ok:false;why:'have'|'coins'|'unknown';need?:number}{
  const price=priceOf(w);if(price==null||(w.kind==='land'&&BASE_LAND.includes(w.id)))return {ok:false,why:'unknown'};
  const k=keyOf[w.kind];if(b[k].includes(w.id))return {ok:false,why:'have'};
  if(coins<price)return {ok:false,why:'coins',need:price-coins};
  return {ok:true,built:{...b,[k]:[...b[k],w.id]},coins:coins-price};
}
