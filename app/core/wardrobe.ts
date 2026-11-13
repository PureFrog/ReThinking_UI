// What the player's observer can wear (models from tools/blender/explorer.py, drawn by app/proto3d/Explorer3D.tsx).
// Four places to dress: coat, hat, bag, held tool, plus a colour set. A few things are there from the start; the rest
// come from playing: a new title (core/rank.ts), a stamp (core/stamps.ts), an analyst's trust, or the cart's currency.
// Nothing here is about returns. A look that names something not unlocked falls back to what is.
import type {StampId} from './stamps';
export type Slot='coat'|'hat'|'bag'|'tool';
export type Who='tori'|'moa'|'luon';
export type Unlock={kind:'start'}|{kind:'rank';index:number}|{kind:'stamp';id:StampId}|{kind:'trust';who:Who;stage:number}|{kind:'buy';price:number};
export type Wear={id:string;slot:Slot;name:string;unlock:Unlock};
export const SLOTS:{id:Slot;label:string}[]=[{id:'coat',label:'겉옷'},{id:'hat',label:'모자'},{id:'bag',label:'가방'},{id:'tool',label:'손'}];
export const WEAR:Wear[]=[
  {id:'coat_vest',slot:'coat',name:'필드 조끼',unlock:{kind:'start'}},
  {id:'coat_lab',slot:'coat',name:'연구 가운',unlock:{kind:'rank',index:2}},
  {id:'coat_rain',slot:'coat',name:'노란 우비',unlock:{kind:'buy',price:6}},
  {id:'coat_knit',slot:'coat',name:'줄무늬 니트',unlock:{kind:'stamp',id:'streak7'}},
  {id:'hat_explorer',slot:'hat',name:'탐험 모자',unlock:{kind:'start'}},
  {id:'hat_beret',slot:'hat',name:'베레모',unlock:{kind:'stamp',id:'first-grade'}},
  {id:'hat_straw',slot:'hat',name:'밀짚모자',unlock:{kind:'buy',price:4}},
  {id:'hat_lamp',slot:'hat',name:'헤드램프',unlock:{kind:'stamp',id:'sure-hit'}},
  {id:'bag_specimen',slot:'bag',name:'표본 가방',unlock:{kind:'rank',index:1}},
  {id:'bag_brief',slot:'bag',name:'서류 가방',unlock:{kind:'trust',who:'tori',stage:2}},
  {id:'bag_tube',slot:'bag',name:'채집통',unlock:{kind:'stamp',id:'capsule'}},
  {id:'tool_loupe',slot:'tool',name:'돋보기',unlock:{kind:'start'}},
  {id:'tool_notebook',slot:'tool',name:'관찰 노트',unlock:{kind:'stamp',id:'ten-judgments'}},
  {id:'tool_staff',slot:'tool',name:'측량 막대',unlock:{kind:'trust',who:'luon',stage:2}},
  {id:'tool_trowel',slot:'tool',name:'꽃삽',unlock:{kind:'stamp',id:'roots'}},
];
// colour sets: primary (top), secondary (trousers, bag), accent; the garden's palette, a couple more to earn
export const PALETTES:{id:string;name:string;primary:string;secondary:string;accent:string;unlock:Unlock}[]=[
  {id:'moss',name:'이끼',primary:'#4b6638',secondary:'#d8ccae',accent:'#d8b25a',unlock:{kind:'start'}},
  {id:'ink',name:'먹',primary:'#2a2620',secondary:'#8a8070',accent:'#b8372b',unlock:{kind:'start'}},
  {id:'sky',name:'하늘',primary:'#2c5c92',secondary:'#e6dac2',accent:'#f4eedf',unlock:{kind:'rank',index:1}},
  {id:'seal',name:'인주',primary:'#b8372b',secondary:'#3b3128',accent:'#f4eedf',unlock:{kind:'stamp',id:'first-grade'}},
  {id:'bark',name:'나무껍질',primary:'#7a5238',secondary:'#c9b98f',accent:'#4b6638',unlock:{kind:'rank',index:3}},
];
export type Look={coat:string;hat:string|null;bag:string|null;tool:string|null;palette:string};
export const DEFAULT_LOOK:Look={coat:'coat_vest',hat:'hat_explorer',bag:null,tool:'tool_loupe',palette:'moss'};
export type WearCtx={rank:number;stamps:string[];trust:Record<Who,number>;bought:string[]};
export function isOpen(u:Unlock,c:WearCtx,id:string){
  switch(u.kind){case 'start':return true;case 'rank':return c.rank>=u.index;case 'stamp':return c.stamps.includes(u.id);
    case 'trust':return c.trust[u.who]>=u.stage;case 'buy':return c.bought.includes(id)}
}
// how to get it, said plainly (the locked tile shows this)
export function howTo(u:Unlock,names:{rank:(i:number)=>string;stamp:(id:StampId)=>string;who:(w:Who)=>string}){
  switch(u.kind){case 'start':return '처음부터';case 'rank':return `${names.rank(u.index)} 되면`;case 'stamp':return `도장 '${names.stamp(u.id)}'`;
    case 'trust':return `${names.who(u.who)} 신뢰 ${u.stage+1}`;case 'buy':return `근거 ${u.price} 내고 사기`}
}
// the look as it can be shown: anything not unlocked falls back to the start piece (or nothing)
export function fitLook(l:Look,c:WearCtx):Look{
  const ok=(id:string|null,slot:Slot)=>{if(!id)return slot==='coat'?DEFAULT_LOOK.coat:null;const w=WEAR.find(x=>x.id===id&&x.slot===slot);return w&&isOpen(w.unlock,c,w.id)?id:slot==='coat'?DEFAULT_LOOK.coat:null};
  const p=PALETTES.find(x=>x.id===l.palette);
  return {coat:ok(l.coat,'coat')!,hat:ok(l.hat,'hat'),bag:ok(l.bag,'bag'),tool:ok(l.tool,'tool'),palette:p&&isOpen(p.unlock,c,p.id)?p.id:'moss'};
}
