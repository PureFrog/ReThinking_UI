'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ITEMS,SLOTS,SLOT_LABEL,KIND_LABEL,toggleWear,sameSlots,formatDay,type Entry,type ItemKind,type Slots} from '../items';
import {ITEM_IMAGES,SPRITES,WEAR_IMAGES} from '../assets';
import {TIMING} from '../timing';
import {subject,type GiftBox} from '../model';
import {EmptyState} from './WorldUI';
import {friendById} from '../friends';

// Temporary item art (11.16-2: never a text-only cell). Replaced per item by ITEM_IMAGES.
const ART:Record<string,ReactNode>={
 candy:<><path d="M14 24 5 16v16z M34 24l9-8v16z" fill="#efc7b6"/><circle cx="24" cy="24" r="11" fill="#e7a4a0"/><path d="M17 19c4 3 10 3 14 0M16 27c5 3 11 3 16 0" stroke="#fbe3da" strokeWidth="2.4" fill="none"/></>,
 sunglasses:<><rect x="6" y="18" width="15" height="12" rx="5" fill="#4e655e"/><rect x="27" y="18" width="15" height="12" rx="5" fill="#4e655e"/><path d="M21 22h6M6 21 3 18M42 21l3-3" stroke="#504b3f" strokeWidth="2.4" strokeLinecap="round"/><path d="M9 21h5" stroke="#9fb5ad" strokeWidth="2" strokeLinecap="round"/></>,
 star_lamp:<><circle cx="24" cy="15" r="12" fill="#ffdb7e" opacity=".25"/><ellipse cx="24" cy="42" rx="9" ry="3" fill="#c4a56f"/><rect x="22.5" y="18" width="3" height="24" fill="#c4a56f"/><path d="m24 4 3 6.5 7 .8-5.2 4.6 1.5 7L24 19.3l-6.3 3.6 1.5-7L14 11.3l7-.8z" fill="#ffe6a1" stroke="#e7c46a"/></>,
 journal_frame:<><rect x="9" y="8" width="30" height="32" rx="3" fill="#c49a6c"/><rect x="13" y="12" width="22" height="24" fill="#fbf4e2"/><path d="M16 18h16M16 23h16M16 28h10" stroke="#a8b896" strokeWidth="2" strokeLinecap="round"/><circle cx="31" cy="30" r="3" fill="#e7a4a0"/></>,
 reading_chair:<><rect x="10" y="22" width="28" height="12" rx="4" fill="#9fb492"/><rect x="12" y="10" width="24" height="15" rx="6" fill="#b4c7a6"/><rect x="7" y="18" width="7" height="16" rx="3" fill="#8ea381"/><rect x="34" y="18" width="7" height="16" rx="3" fill="#8ea381"/><path d="M13 34v6M35 34v6" stroke="#8f7350" strokeWidth="3" strokeLinecap="round"/></>,
 gold_bookend:<><rect x="12" y="10" width="7" height="28" rx="1.5" fill="#e3c27e" stroke="#c99a46"/><rect x="20" y="13" width="6" height="25" rx="1.5" fill="#e8cf8f" stroke="#c99a46"/><rect x="27" y="11" width="7" height="27" rx="1.5" fill="#e3c27e" stroke="#c99a46"/><path d="M8 38h32" stroke="#a8875f" strokeWidth="3" strokeLinecap="round"/></>,
 blanket:<><rect x="6" y="14" width="36" height="22" rx="6" fill="#d7b4a7"/><path d="M6 22h36M6 29h36" stroke="#f3dccc" strokeWidth="2"/><path d="M34 14v22" stroke="#c39b8e" strokeWidth="2"/></>,
 scarf:<><rect x="8" y="14" width="32" height="10" rx="4" fill="#d99e88"/><rect x="27" y="20" width="9" height="20" rx="3" fill="#d99e88"/><path d="M29 38v4M32 38v4M35 38v4" stroke="#c4836e" strokeWidth="1.6"/></>,
 flower_pin:<><circle cx="18" cy="22" r="7" fill="#e9b4bb"/><circle cx="30" cy="22" r="7" fill="#e9b4bb"/><circle cx="24" cy="13" r="7" fill="#e9b4bb"/><circle cx="24" cy="29" r="7" fill="#efc4c9"/><circle cx="24" cy="21" r="5" fill="#f5dfa0"/><path d="M24 35v8" stroke="#8fab7e" strokeWidth="2.4" strokeLinecap="round"/></>,
};
export function ItemIcon({name,size=40}:{name:string;size?:number}){const def=ITEMS[name];const src=def&&ITEM_IMAGES[def.id];if(src)return <img src={src} alt="" width={size} height={size} className="item-icon"/>;return <svg viewBox="0 0 48 48" width={size} height={size} className="item-icon" aria-hidden="true">{def?ART[def.id]:<rect x="10" y="14" width="28" height="22" rx="5" fill="#d9cdb0"/>}</svg>}

// Fallback shapes for clothes without WEAR_IMAGES art; same coordinates as game.ts dress().
const WEAR:Record<string,ReactNode>={
 '여름 선글라스':<><rect x="-18" y="-71" width="16" height="11" rx="4" fill="#4e655e" opacity=".95"/><rect x="2" y="-71" width="16" height="11" rx="4" fill="#4e655e" opacity=".95"/><path d="M-3-67h6" stroke="#504b3f" strokeWidth="3"/></>,
 '산책 목도리':<><rect x="-20" y="-49" width="40" height="10" rx="4" fill="#d99e88"/><rect x="10" y="-43" width="10" height="25" rx="3" fill="#d99e88"/></>,
 '꽃 장식':<><circle cx="-15" cy="-88" r="6" fill="#e9b4bb"/><circle cx="-23" cy="-88" r="6" fill="#e9b4bb"/><circle cx="-19" cy="-95" r="6" fill="#e9b4bb"/><circle cx="-19" cy="-89" r="4" fill="#f5dfa0"/></>,
};
export function PlayerPreview({slots}:{slots:Slots}){const s=SPRITES.player.size;return <svg className="player-preview" viewBox="0 0 120 160" role="img" aria-label={'미리보기: '+(SLOTS.map(k=>slots[k]).filter(Boolean).join(', ')||'아무것도 안 입음')}><g transform="translate(60 150) scale(1.5)">
 <image href={SPRITES.player.url} x={-s/2} y={-s} width={s} height={s}/>
 {SLOTS.map(k=>{const name=slots[k];if(!name)return null;const w=WEAR_IMAGES[name];return w?<image key={k} href={w.se.url} x={-s/2} y={-s} width={s} height={s}/>:<g key={k}>{WEAR[name]}</g>})}
</g></svg>}

// Light irreversible actions use a 0.6s press instead of a confirm dialog (11.1).
export function HoldButton({onDone,children,className=''}:{onDone:()=>void;children:ReactNode;className?:string}){const [holding,setHolding]=useState(false);const t=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);const done=useRef(onDone);done.current=onDone;const start=()=>{clearTimeout(t.current);setHolding(true);t.current=setTimeout(()=>{setHolding(false);done.current()},TIMING.hold)};const stop=()=>{clearTimeout(t.current);setHolding(false)};useEffect(()=>()=>clearTimeout(t.current),[]);return <button type="button" className={'hold-button '+(holding?'holding ':'')+className} style={{['--hold' as string]:TIMING.hold+'ms'}} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();start()}}} onKeyUp={stop}><span className="hold-fill" aria-hidden="true"/>{children}</button>}

const sender=(g?:GiftBox)=>!g?'처음부터 있던 옷':g.anonymous?'누군가 두고 갔어':subject(friendById(g.sender).name)+' 줬어';
type Filter='all'|ItemKind;
// 보유함: picture grid + filter tabs + detail area (11.8-③).
export function Inventory({entries,slots,received,onTryOn,onPlace,onStore,onEat}:{entries:Entry[];slots:Slots;received:Record<string,string>;onTryOn:(name:string)=>void;onPlace:(e:Entry)=>void;onStore:(e:Entry)=>void;onEat:(e:Entry)=>void}){
 const [filter,setFilter]=useState<Filter>('all');const shown=entries.filter(e=>filter==='all'||e.def.kind===filter);
 const [picked,setPicked]=useState<string>(()=>entries.find(e=>e.fresh)?.name??entries[0]?.name??'');const sel=shown.find(e=>e.name===picked)??shown[0];
 const wearing=(name:string)=>SLOTS.some(s=>slots[s]===name);
 if(!entries.length)return <EmptyState friend="moa">아직 받은 선물이 없어.<br/>친구들이 놀러 오면 뭔가 두고 갈지도?</EmptyState>;
 return <div className="inventory">
  <div className="filter-tabs" role="tablist">{(['all','clothes','furniture','consumable'] as Filter[]).map(f=><button key={f} role="tab" aria-selected={filter===f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f==='all'?'전체':KIND_LABEL[f]}</button>)}</div>
  <div className="inventory-body">
   <div className="item-grid">{shown.map(e=><button key={e.name} className={'item-cell'+(sel?.name===e.name?' selected':'')} aria-pressed={sel?.name===e.name} onClick={()=>setPicked(e.name)}><ItemIcon name={e.name}/><strong>{e.name}</strong>{e.count>1&&<b className="item-count">×{e.count}</b>}{e.fresh?<em className="badge fresh">새 물건</em>:wearing(e.name)?<em className="badge">입는 중</em>:e.placed?<em className="badge">놓여 있음</em>:null}</button>)}{!shown.length&&entries.length>0&&<p className="grid-empty">이 칸은 아직 비어 있어.</p>}</div>
   {sel&&<aside className="item-detail" aria-live="polite"><ItemIcon name={sel.name} size={72}/><h3>{sel.name}</h3><p className="item-kind">{KIND_LABEL[sel.def.kind]}{sel.def.slot?' · '+SLOT_LABEL[sel.def.slot]:''}</p><p>{sel.def.desc}</p>
    <dl><div><dt>보낸 이</dt><dd>{sender(sel.gifts[0])}</dd></div>{sel.gifts[0]&&received[sel.gifts[0].id]&&<div><dt>받은 날</dt><dd>{formatDay(received[sel.gifts[0].id])}</dd></div>}</dl>
    {sel.def.note&&sel.gifts[0]&&<blockquote>“{sel.def.note}”</blockquote>}
    <div className="detail-actions">{sel.def.kind==='clothes'?<button className="primary" onClick={()=>onTryOn(sel.name)}>{wearing(sel.name)?'옷장에서 보기':'입어 보기'}</button>:sel.def.kind==='furniture'?(sel.placed?<button className="secondary" onClick={()=>onStore(sel)}>서랍에 넣기</button>:<button className="primary" onClick={()=>onPlace(sel)}>꺼내서 놓기</button>):<HoldButton className="primary" onDone={()=>onEat(sel)}>꾹 눌러 먹기</HoldButton>}</div>
    {sel.gifts[0]&&<p className="keep-note">친구가 준 거라 간직할래</p>}
   </aside>}
  </div>
 </div>
}

// 옷장: tap to preview on the full-body figure first, '입기' to commit (11.8, 11.16-3).
export function Wardrobe({slots,owned,initial,onWear}:{slots:Slots;owned:string[];initial?:string;onWear:(next:Slots)=>void}){
 const [preview,setPreview]=useState<Slots>(()=>initial?(()=>{const s=ITEMS[initial]?.slot;return s&&slots[s]!==initial?{...slots,[s]:initial}:slots})():slots);
 const changed=!sameSlots(preview,slots);
 return <div className="wardrobe-room">
  <div className="wardrobe-stage"><PlayerPreview slots={preview}/><ul className="slot-list">{SLOTS.map(s=><li key={s} className={preview[s]?'filled':''}><span>{SLOT_LABEL[s]}</span>{preview[s]??'비어 있음'}</li>)}</ul></div>
  <div className="item-grid wardrobe-grid">{owned.map(name=>{const slot=ITEMS[name].slot!;const on=preview[slot]===name;return <button key={name} className={'item-cell'+(on?' selected':'')} aria-pressed={on} onClick={()=>setPreview(p=>toggleWear(p,name))}><ItemIcon name={name}/><strong>{name}</strong>{slots[slot]===name&&<em className="badge">입는 중</em>}</button>})}</div>
  <div className="wardrobe-actions"><button className="secondary" disabled={!changed} onClick={()=>setPreview(slots)}>되돌리기</button><button className="primary" disabled={!changed} onClick={()=>onWear(preview)}>입기</button></div>
 </div>
}

// After the acquisition card, the item's picture arcs into the drawer (11.8-② step 5).
export function FlyToDrawer({name,from,to,onDone}:{name:string;from:{x:number;y:number};to:{x:number;y:number};onDone:()=>void}){const ref=useRef<HTMLDivElement>(null);const done=useRef(onDone);done.current=onDone;useEffect(()=>{const el=ref.current;if(!el||!el.animate){done.current();return}const mid={x:(from.x+to.x)/2,y:Math.min(from.y,to.y)-40};const a=el.animate([{transform:`translate(${from.x}px,${from.y}px) scale(1)`},{transform:`translate(${mid.x}px,${mid.y}px) scale(.8)`,offset:.45},{transform:`translate(${to.x}px,${to.y}px) scale(.35)`,opacity:.4}],{duration:TIMING.giftFly,easing:'ease-in',fill:'forwards'});a.onfinish=()=>done.current();return()=>a.cancel()},[]);return <div ref={ref} className="fly-item" aria-hidden="true"><ItemIcon name={name} size={40}/></div>}
