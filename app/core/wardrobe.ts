import {WON,won} from './won';
// What the player's observer can wear (models from tools/blender/explorer.py, drawn by app/proto3d/Explorer3D.tsx).
// Four places to dress: coat, hat, bag, held tool, plus a colour set. A few things are there from the start; the rest
// come from playing: a new title (core/rank.ts), a stamp (core/stamps.ts), an analyst's trust, or the cart's currency.
// Nothing here is about returns. A look that names something not unlocked falls back to what is.
import type {StampId} from './stamps';
export type Slot='coat'|'hat'|'bag'|'tool';
export type Who='tori'|'moa'|'luon';
export type Unlock={kind:'start'}|{kind:'rank';index:number}|{kind:'stamp';id:StampId}|{kind:'trust';who:Who;stage:number}|{kind:'buy';price:number};
// icon: the tile's picture; kit: drawn from plain shapes in code (app/proto3d/WearKit.tsx), not a Blender model;
// tint: a coat's own colour (the sleeves follow it) instead of the colour set's
export type Wear={id:string;slot:Slot;name:string;unlock:Unlock;icon?:string;kit?:true;tint?:string};
export const SLOTS:{id:Slot;label:string}[]=[{id:'coat',label:'겉옷'},{id:'hat',label:'모자'},{id:'bag',label:'가방'},{id:'tool',label:'손'}];
export const WEAR:Wear[]=[
  {id:'coat_vest',slot:'coat',name:'필드 조끼',unlock:{kind:'start'},icon:'🦺'},
  {id:'coat_lab',slot:'coat',name:'연구 가운',unlock:{kind:'rank',index:2},icon:'🥼'},
  {id:'coat_rain',slot:'coat',name:'노란 우비',unlock:{kind:'buy',price:WON*15},icon:'🧥'},
  {id:'coat_knit',slot:'coat',name:'줄무늬 니트',unlock:{kind:'stamp',id:'streak7'},icon:'🧶'},
  {id:'hat_explorer',slot:'hat',name:'탐험 모자',unlock:{kind:'start'},icon:'🤠'},
  {id:'hat_beret',slot:'hat',name:'베레모',unlock:{kind:'stamp',id:'first-grade'},icon:'🎨'},
  {id:'hat_straw',slot:'hat',name:'밀짚모자',unlock:{kind:'buy',price:WON*10},icon:'👒'},
  {id:'hat_lamp',slot:'hat',name:'헤드램프',unlock:{kind:'stamp',id:'sure-hit'},icon:'🔦'},
  {id:'bag_specimen',slot:'bag',name:'표본 가방',unlock:{kind:'rank',index:1},icon:'🎒'},
  {id:'bag_brief',slot:'bag',name:'서류 가방',unlock:{kind:'trust',who:'tori',stage:2},icon:'💼'},
  {id:'bag_tube',slot:'bag',name:'채집통',unlock:{kind:'stamp',id:'capsule'},icon:'🧪'},
  {id:'tool_loupe',slot:'tool',name:'돋보기',unlock:{kind:'start'},icon:'🔍'},
  {id:'tool_notebook',slot:'tool',name:'관찰 노트',unlock:{kind:'stamp',id:'ten-judgments'},icon:'📓'},
  {id:'tool_staff',slot:'tool',name:'측량 막대',unlock:{kind:'trust',who:'luon',stage:2},icon:'📏'},
  {id:'tool_trowel',slot:'tool',name:'꽃삽',unlock:{kind:'stamp',id:'roots'},icon:'🌱'},
  // 피드백 2026-11-26 "옷·모자·가방 더 많이": made in code (WearKit.tsx); most can be bought at the 옷 가게 prices
  {id:'coat_hoodie',slot:'coat',name:'오렌지 후드티',unlock:{kind:'buy',price:WON*20},icon:'🧡',kit:true,tint:'#e8875a'},
  {id:'coat_denim',slot:'coat',name:'데님 재킷',unlock:{kind:'buy',price:WON*30},icon:'👖',kit:true,tint:'#5b7fa8'},
  {id:'coat_trench',slot:'coat',name:'트렌치코트',unlock:{kind:'buy',price:WON*45},icon:'🧥',kit:true,tint:'#c8a26a'},
  {id:'coat_suit',slot:'coat',name:'정장 재킷',unlock:{kind:'buy',price:WON*40},icon:'👔',kit:true,tint:'#2f3a52'},
  {id:'coat_aloha',slot:'coat',name:'알로하 셔츠',unlock:{kind:'buy',price:WON*18},icon:'🌺',kit:true,tint:'#e0645a'},
  {id:'coat_puffer',slot:'coat',name:'겨울 패딩',unlock:{kind:'buy',price:WON*50},icon:'❄️',kit:true,tint:'#3d6b8a'},
  {id:'hat_cap',slot:'hat',name:'야구 모자',unlock:{kind:'buy',price:WON*12},icon:'🧢',kit:true},
  {id:'hat_beanie',slot:'hat',name:'방울 비니',unlock:{kind:'buy',price:WON*12},icon:'🧶',kit:true},
  {id:'hat_fedora',slot:'hat',name:'중절모',unlock:{kind:'buy',price:WON*25},icon:'🎩',kit:true},
  {id:'hat_flower',slot:'hat',name:'꽃 화관',unlock:{kind:'buy',price:WON*15},icon:'🌼',kit:true},
  {id:'hat_cat',slot:'hat',name:'고양이 귀',unlock:{kind:'buy',price:WON*10},icon:'🐱',kit:true},
  {id:'hat_phones',slot:'hat',name:'헤드폰',unlock:{kind:'buy',price:WON*35},icon:'🎧',kit:true},
  {id:'hat_crown',slot:'hat',name:'종이 왕관',unlock:{kind:'stamp',id:'streak7'},icon:'👑',kit:true},
  {id:'bag_back',slot:'bag',name:'캠핑 백팩',unlock:{kind:'buy',price:WON*30},icon:'🎒',kit:true},
  {id:'bag_eco',slot:'bag',name:'에코백',unlock:{kind:'buy',price:WON*10},icon:'🛍️',kit:true},
  {id:'bag_cross',slot:'bag',name:'동글 크로스백',unlock:{kind:'buy',price:WON*18},icon:'👜',kit:true},
  {id:'bag_wings',slot:'bag',name:'작은 날개',unlock:{kind:'buy',price:WON*60},icon:'🪽',kit:true},
  {id:'tool_coffee',slot:'tool',name:'아이스 커피',unlock:{kind:'buy',price:WON*5},icon:'🧋',kit:true},
  {id:'tool_umbrella',slot:'tool',name:'빨간 우산',unlock:{kind:'buy',price:WON*12},icon:'☂️',kit:true},
  {id:'tool_balloon',slot:'tool',name:'풍선',unlock:{kind:'buy',price:WON*3},icon:'🎈',kit:true},
  {id:'tool_bouquet',slot:'tool',name:'꽃다발',unlock:{kind:'buy',price:WON*20},icon:'💐',kit:true},
  {id:'tool_tablet',slot:'tool',name:'차트 태블릿',unlock:{kind:'buy',price:WON*40},icon:'📈',kit:true},
  {id:'tool_icecream',slot:'tool',name:'아이스크림',unlock:{kind:'buy',price:WON*4},icon:'🍦',kit:true},
];
// colour sets: primary (top), secondary (trousers, bag), accent; the garden's palette, a couple more to earn
export const PALETTES:{id:string;name:string;primary:string;secondary:string;accent:string;unlock:Unlock}[]=[
  {id:'moss',name:'이끼',primary:'#4b6638',secondary:'#d8ccae',accent:'#d8b25a',unlock:{kind:'start'}},
  {id:'ink',name:'먹',primary:'#2a2620',secondary:'#8a8070',accent:'#b8372b',unlock:{kind:'start'}},
  {id:'sky',name:'하늘',primary:'#2c5c92',secondary:'#e6dac2',accent:'#f4eedf',unlock:{kind:'rank',index:1}},
  {id:'seal',name:'인주',primary:'#b8372b',secondary:'#3b3128',accent:'#f4eedf',unlock:{kind:'stamp',id:'first-grade'}},
  {id:'sakura',name:'벚꽃',primary:'#e89bb0',secondary:'#fbeef0',accent:'#8a4f6a',unlock:{kind:'buy',price:WON*8}},
  {id:'ocean',name:'바다',primary:'#2a8a9a',secondary:'#e8f1ee',accent:'#f2c230',unlock:{kind:'buy',price:WON*8}},
  {id:'lemon',name:'레몬',primary:'#e8c84a',secondary:'#4f6b5a',accent:'#ffffff',unlock:{kind:'buy',price:WON*8}},
  {id:'night',name:'밤하늘',primary:'#2c2f5a',secondary:'#c9c3e6',accent:'#f2d36a',unlock:{kind:'buy',price:WON*12}},
  {id:'bark',name:'나무껍질',primary:'#7a5238',secondary:'#c9b98f',accent:'#4b6638',unlock:{kind:'rank',index:3}},
];
export type Look={coat:string;hat:string|null;bag:string|null;tool:string|null;palette:string};
export const DEFAULT_LOOK:Look={coat:'coat_vest',hat:'hat_explorer',bag:null,tool:'tool_loupe',palette:'moss'};
// all: the master account (core/master.ts) has everything open
export type WearCtx={rank:number;stamps:string[];trust:Record<Who,number>;bought:string[];all?:boolean};
export function isOpen(u:Unlock,c:WearCtx,id:string){
  if(c.all)return true;
  switch(u.kind){case 'start':return true;case 'rank':return c.rank>=u.index;case 'stamp':return c.stamps.includes(u.id);
    case 'trust':return c.trust[u.who]>=u.stage;case 'buy':return c.bought.includes(id)}
}
// how to get it, said plainly (the locked tile shows this)
export function howTo(u:Unlock,names:{rank:(i:number)=>string;stamp:(id:StampId)=>string;who:(w:Who)=>string}){
  switch(u.kind){case 'start':return '처음부터';case 'rank':return `${names.rank(u.index)} 되면`;case 'stamp':return `업적 '${names.stamp(u.id)}'`;
    case 'trust':return `${names.who(u.who)} 신뢰 ${u.stage+1}`;case 'buy':return `${won(u.price)}에 사기`}
}
// the look as it can be shown: anything not unlocked falls back to the start piece (or nothing)
export function fitLook(l:Look,c:WearCtx):Look{
  const ok=(id:string|null,slot:Slot)=>{if(!id)return slot==='coat'?DEFAULT_LOOK.coat:null;const w=WEAR.find(x=>x.id===id&&x.slot===slot);return w&&isOpen(w.unlock,c,w.id)?id:slot==='coat'?DEFAULT_LOOK.coat:null};
  const p=PALETTES.find(x=>x.id===l.palette);
  return {coat:ok(l.coat,'coat')!,hat:ok(l.hat,'hat'),bag:ok(l.bag,'bag'),tool:ok(l.tool,'tool'),palette:p&&isOpen(p.unlock,c,p.id)?p.id:'moss'};
}
