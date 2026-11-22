'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ITEMS,SLOTS,SLOT_LABEL,KIND_LABEL,toggleWear,sameSlots,formatDay,type Entry,type ItemKind,type Slots} from '../core/items';
import {ITEM_IMAGES,SPRITES,WEAR_IMAGES} from '../scene/assets';
import {TIMING} from '../core/timing';
import {subject,type GiftBox} from '../core/model';
import {EmptyState} from './WorldUI';
import {friendById,portraitStyle} from '../content/friends';

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
 berry_jam:<><rect x="13" y="16" width="22" height="25" rx="5" fill="#d9707a"/><rect x="12" y="10" width="24" height="7" rx="2" fill="#efe1c4"/><path d="M12 13h24" stroke="#d8c39a" strokeWidth="1.5"/><circle cx="20" cy="27" r="3" fill="#f0a3a8"/><circle cx="27" cy="31" r="3" fill="#f0a3a8"/><path d="M15 21h18" stroke="#fbe3da" strokeWidth="2" opacity=".6"/></>,
 yarn_basket:<><path d="M8 26h32l-4 14H12z" fill="#c9a06c"/><path d="M10 31h28M11 36h26" stroke="#a9824f" strokeWidth="1.6"/><circle cx="17" cy="22" r="7" fill="#e9a0a6"/><circle cx="29" cy="21" r="7" fill="#9fb8d9"/><circle cx="23" cy="17" r="6" fill="#f2d48a"/><path d="M27 18c3 2 4 5 3 8M15 19c3 1 4 4 3 7" stroke="#fff6" strokeWidth="1.5" fill="none"/></>,
 pressed_flowers:<><rect x="9" y="8" width="30" height="32" rx="3" fill="#b99671"/><rect x="13" y="12" width="22" height="24" fill="#f7efdc"/><path d="M24 33V19" stroke="#8fab7e" strokeWidth="2"/><circle cx="24" cy="18" r="4" fill="#e9b4bb"/><circle cx="19" cy="24" r="3" fill="#c7b3dd"/><circle cx="29" cy="25" r="3" fill="#f2d48a"/><path d="M24 28l-5-3M24 29l5-3" stroke="#8fab7e" strokeWidth="1.6"/></>,
 wildflower_vase:<><path d="M18 28h12l-2 14h-8z" fill="#9fb8c9"/><path d="M24 28V14M24 28l-7-10M24 28l7-9" stroke="#7f9c6e" strokeWidth="2"/><circle cx="24" cy="12" r="4" fill="#f2d48a"/><circle cx="16" cy="17" r="4" fill="#e9b4bb"/><circle cx="32" cy="18" r="4" fill="#c7b3dd"/></>,
 star_pebble:<><ellipse cx="24" cy="38" rx="15" ry="4" fill="#d8cdb4"/><path d="m24 9 4.5 9.5 10.5 1.2-7.8 7 2.2 10.3L24 31.8l-9.4 5.2 2.2-10.3-7.8-7 10.5-1.2z" fill="#c9c3b8" stroke="#a69f92" strokeWidth="1.5"/><path d="M20 20l3-4" stroke="#eee9df" strokeWidth="2" strokeLinecap="round"/></>,
 acorn_sprout:<><path d="M14 30h20l-3 12H17z" fill="#c98f5f"/><rect x="12" y="27" width="24" height="5" rx="2" fill="#b47c4e"/><path d="M24 27V17" stroke="#7f9c6e" strokeWidth="2.4"/><ellipse cx="19" cy="15" rx="6" ry="3.5" fill="#92aa7a" transform="rotate(-20 19 15)"/><ellipse cx="29" cy="13" rx="6" ry="3.5" fill="#a8c08e" transform="rotate(20 29 13)"/><ellipse cx="24" cy="28" rx="4" ry="3" fill="#a87a4a"/></>,
 barley_tea:<><rect x="16" y="13" width="16" height="28" rx="6" fill="#7f93b5"/><rect x="18" y="8" width="12" height="7" rx="2" fill="#5d6f91"/><rect x="16" y="22" width="16" height="7" fill="#b9c7de"/><path d="M20 6c0-2 2-2 2-4M26 6c0-2 2-2 2-4" stroke="#d9cdb0" strokeWidth="1.6" fill="none"/></>,
 wood_box:<><path d="M8 20l16-7 16 7-16 7z" fill="#d6b48a"/><path d="M8 20v14l16 8V27z" fill="#bf9a6e"/><path d="M40 20v14l-16 8V27z" fill="#a9845a"/><path d="M8 27l16 8M40 27l-16 8" stroke="#93714a" strokeWidth="1.4"/></>,
 star_mobile:<><path d="M24 4v8M10 12h28M12 12v12M24 12v18M36 12v9" stroke="#a69f92" strokeWidth="1.6"/><path d="m12 24 2 4 4.4.5-3.3 3 .9 4.3L12 33.6l-4 2.2.9-4.3-3.3-3 4.4-.5z" fill="#ffe6a1" stroke="#e7c46a"/><path d="m24 30 2 4 4.4.5-3.3 3 .9 4.3L24 39.6l-4 2.2.9-4.3-3.3-3 4.4-.5z" fill="#ffe6a1" stroke="#e7c46a"/><circle cx="36" cy="24" r="4" fill="#b9c7de"/></>,
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

// an anonymous friend found out in its 단짝 scene is named, with a 'maybe' (ux-spec 3장)
export const senderLine=(g:GiftBox,revealed:string[]=[])=>g.sender==='cart'?'행상 수레에서 샀어':g.anonymous?(revealed.includes(g.sender)?friendById(g.sender).name+'(아마도)':'누군가 두고 갔어'):subject(friendById(g.sender).name)+' 줬어';
const sender=(g:GiftBox|undefined,revealed:string[])=>!g?'처음부터 있던 옷':senderLine(g,revealed);
type Filter='all'|ItemKind;
// 보유함: picture grid + filter tabs + detail area (11.8-③).
export function Inventory({entries,slots,received,onTryOn,onPlace,onStore,onEat,revealed=[]}:{revealed?:string[];entries:Entry[];slots:Slots;received:Record<string,string>;onTryOn:(name:string)=>void;onPlace:(e:Entry)=>void;onStore:(e:Entry)=>void;onEat:(e:Entry)=>void}){
 const [filter,setFilter]=useState<Filter>('all');const shown=entries.filter(e=>filter==='all'||e.def.kind===filter);
 const [picked,setPicked]=useState<string>(()=>entries.find(e=>e.fresh)?.name??entries[0]?.name??'');const sel=shown.find(e=>e.name===picked)??shown[0];
 const wearing=(name:string)=>SLOTS.some(s=>slots[s]===name);
 if(!entries.length)return <EmptyState friend="moa">아직 받은 선물이 없어.<br/>친구들이 놀러 오면 뭔가 두고 갈지도?</EmptyState>;
 return <div className="inventory">
  <div className="filter-tabs" role="tablist">{(['all','clothes','furniture','consumable'] as Filter[]).map(f=><button key={f} role="tab" aria-selected={filter===f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f==='all'?'전체':KIND_LABEL[f]}</button>)}</div>
  <div className="inventory-body">
   <div className="item-grid">{shown.map(e=><button key={e.name} className={'item-cell'+(sel?.name===e.name?' selected':'')} aria-pressed={sel?.name===e.name} onClick={()=>setPicked(e.name)}><ItemIcon name={e.name}/><strong>{e.name}</strong>{e.count>1&&<b className="item-count">×{e.count}</b>}{e.fresh?<em className="badge fresh">새 물건</em>:wearing(e.name)?<em className="badge">입는 중</em>:e.placed?<em className="badge">놓여 있음</em>:null}</button>)}{!shown.length&&entries.length>0&&<p className="grid-empty">이 칸은 아직 비어 있어.</p>}</div>
   {sel&&<aside className="item-detail" aria-live="polite"><ItemIcon name={sel.name} size={72}/><h3>{sel.name}</h3><p className="item-kind">{KIND_LABEL[sel.def.kind]}{sel.def.slot?' · '+SLOT_LABEL[sel.def.slot]:''}</p><p>{sel.def.desc}</p>
    <dl><div><dt>보낸 이</dt><dd>{sender(sel.gifts[0],revealed)}</dd></div>{sel.gifts[0]&&received[sel.gifts[0].id]&&<div><dt>받은 날</dt><dd>{formatDay(received[sel.gifts[0].id])}</dd></div>}</dl>
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

// 선물하기 (11.8, ux-spec 3장): only while a friend is over. Pick the friend, pick a thing, hand it over in the world.
export type Giftable={entry:Entry;gift:GiftBox};
export function GiftGiving({items,guests,onGive}:{items:Giftable[];guests:string[];onGive:(to:string,g:Giftable)=>void}){
 const [to,setTo]=useState(guests[0]??'');const friend=guests.includes(to)?to:guests[0];
 const [picked,setPicked]=useState(items[0]?.entry.name??'');const sel=items.find(i=>i.entry.name===picked)??items[0];
 if(!friend)return <EmptyState friend="moa">친구가 놀러 와 있을 때<br/>선물을 건넬 수 있어.</EmptyState>;
 const name=friendById(friend).name;
 return <div className="gift-giving">
  {guests.length>1&&<div className="filter-tabs" role="radiogroup" aria-label="누구에게">{guests.map(id=><button key={id} role="radio" aria-checked={friend===id} className={friend===id?'selected':''} onClick={()=>setTo(id)}><span className="portrait give-face" style={portraitStyle(friendById(id))} aria-hidden="true"/>{friendById(id).name}</button>)}</div>}
  {!items.length?<EmptyState friend={friend}>{name}에게 줄 만한 게 아직 없어.<br/>친구들이 두고 간 선물을 모아 봐.</EmptyState>:<div className="inventory-body">
   <div className="item-grid">{items.map(i=><button key={i.entry.name} className={'item-cell'+(sel?.entry.name===i.entry.name?' selected':'')} aria-pressed={sel?.entry.name===i.entry.name} onClick={()=>setPicked(i.entry.name)}><ItemIcon name={i.entry.name}/><strong>{i.entry.name}</strong>{i.entry.count>1&&<b className="item-count">×{i.entry.count}</b>}</button>)}</div>
   {sel&&<aside className="item-detail" aria-live="polite"><ItemIcon name={sel.entry.name} size={72}/><h3>{sel.entry.name}</h3><p className="item-kind">{KIND_LABEL[sel.entry.def.kind]}</p><p>{sel.entry.def.desc}</p>
    <div className="detail-actions"><button className="primary" onClick={()=>onGive(friend,sel)}>{name}에게 건네기</button></div>
    <p className="keep-note">건네면 서랍에서 빠지고 {name}의 것이 돼.</p>
   </aside>}
  </div>}
 </div>
}
