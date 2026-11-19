'use client';
// 부지·건물·랜드마크 screens (core/land.ts, docs/mockups/build.html B+C):
//   BuildBar      넓히기 mode's strip: my coins, how coins come (the work, never returns), 도시 수첩, 끝내기
//   BuildTags     a price tag over each closed lot in the garden, pinned each frame like the bubbles (screen.ts)
//   BuildConfirm  the card after tapping a lot: what it gives, the price, 넓히기/짓기
//   CityBook      세계 증시 도시 수첩: the five cities on a strip map, their landmark, index and one line; 열기
// Words are 넓히기·짓기·열기 (never "사다"); no line here suggests buying or selling a stock.
import {useEffect,useRef} from 'react';
import {screenPoints} from '../screen';
import {Sheet} from './Sheet';
import {LANDS,BUILDINGS,CITIES,BASE_LAND,priceOf,type Built,type Want} from '../../core/land';
import {EARN} from '../../core/ledger';

export const Coin=()=><span className="bd-coin" aria-hidden>C</span>;
const nameOf=(w:Want)=>w.kind==='land'?LANDS.find(l=>l.id===w.id)!.name:w.kind==='building'?BUILDINGS.find(b=>b.id===w.id)!.name:CITIES.find(c=>c.id===w.id)!.landmark;
const descOf=(w:Want)=>w.kind==='land'?LANDS.find(l=>l.id===w.id)!.desc:w.kind==='building'?BUILDINGS.find(b=>b.id===w.id)!.desc:CITIES.find(c=>c.id===w.id)!.blurb;

export function BuildBar({coins,onCities,onDone}:{coins:number;onCities:()=>void;onDone:()=>void}){
  return <section className="bd-bar" aria-label="넓히기">
    <div className="bd-bar-top"><b>넓히기</b><span className="bd-coins rt-num" aria-label={`코인 ${coins}`}><Coin/>{coins}</span>
      <button type="button" className="bd-chip" onClick={onCities}>도시 수첩</button><button type="button" className="bd-chip strong" onClick={onDone}>끝내기</button></div>
    <p className="bd-earn">일지 저장 +{EARN.journal} · 가설 확정 +{EARN.confirm} · 복기 +{EARN.review} — 수익률·적중과는 상관없어요</p>
  </section>;
}

export function BuildTags({built,coins,onPick}:{built:Built;coins:number;onPick:(w:Want)=>void}){
  const refs=useRef(new Map<string,HTMLButtonElement>());
  useEffect(()=>{let raf=0;const tick=()=>{for(const [k,el] of refs.current){const p=screenPoints.get('lot-'+k);
      if(!p||!p.visible||p.y<150){el.style.visibility='hidden';continue}el.style.visibility='visible';
      // kept whole on screen (the tag's tail may then point a little off its lot)
      const half=el.offsetWidth/2,max=(el.parentElement?.clientWidth??innerWidth)-half-10,x=Math.max(half+10,Math.min(max,p.x));el.style.transform=`translate(${x}px,${p.y}px) translate(-50%,-100%)`}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[]);
  const items:Want[]=[...LANDS.filter(l=>!BASE_LAND.includes(l.id)&&!built.land.includes(l.id)).map(l=>({kind:'land' as const,id:l.id})),
    ...BUILDINGS.filter(b=>!built.buildings.includes(b.id)).map(b=>({kind:'building' as const,id:b.id}))];
  return <>{items.map(w=>{const k=`${w.kind}:${w.id}`,price=priceOf(w)!;return <button key={k} type="button" className={`bd-tag${coins>=price?'':' short'}`} style={{visibility:'hidden'}}
    aria-label={`${nameOf(w)} · 코인 ${price}`} ref={el=>{if(el)refs.current.set(k,el);else refs.current.delete(k)}} onClick={()=>onPick(w)}>
    <Coin/><b className="rt-num">{price}</b>{nameOf(w)}</button>})}</>;
}

export function BuildConfirm({want,coins,onYes,onNo}:{want:Want;coins:number;onYes:()=>void;onNo:()=>void}){
  const price=priceOf(want)!,short=price-coins,verb=want.kind==='land'?'넓히기':want.kind==='building'?'짓기':'열기';
  return <section className="bd-pop" role="dialog" aria-label={`${nameOf(want)} ${verb}`}>
    <div className="rt-kicker">{want.kind==='land'?'빈 땅':want.kind==='building'?'건물 터':'도시'}</div>
    <h3>{nameOf(want)}</h3><p>{descOf(want)}</p>
    {short>0&&<p className="bd-short">코인이 {short} 모자라요. 일지를 쓰고 복기하면 모여요.</p>}
    <div className="bd-pop-acts"><button type="button" className="rt-btn" onClick={onNo}>닫기</button>
      <button type="button" className="bd-go" disabled={short>0} onClick={onYes}>{verb}<em><Coin/>{price}</em></button></div>
  </section>;
}

// the strip map: west (뉴욕) to east (도쿄), roughly where they are
const MAP:Record<string,[number,number]>={newyork:[14,48],london:[42,30],paris:[46,42],seoul:[78,44],tokyo:[86,50]};
export function CityBook({built,coins,onOpen,onClose}:{built:Built;coins:number;onOpen:(id:string)=>void;onClose:()=>void}){
  const got=CITIES.filter(c=>built.cities.includes(c.id)).length,next=CITIES.find(c=>!built.cities.includes(c.id));
  return <Sheet kicker={`랜드마크 · ${got} / ${CITIES.length} 도시`} title="세계 증시 도시" label="도시 수첩" onClose={onClose}>
    <div className="bd-head"><span className="bd-coins rt-num" aria-label={`코인 ${coins}`}><Coin/>{coins}</span><span className="rt-hint">열면 정원 가장자리에 세워져요</span></div>
    <div className="bd-map" aria-hidden><svg viewBox="0 0 100 60" preserveAspectRatio="none"><path d="M2 32 Q16 18 30 26 T56 22 T82 30 T98 26 L98 60 L2 60Z" fill="#cfe3c8"/></svg>
      {CITIES.map(c=><span key={c.id} className={`bd-dot${built.cities.includes(c.id)?' got':c.id===next?.id?' next':''}`} style={{left:`${MAP[c.id][0]}%`,top:`${MAP[c.id][1]}%`}}><i>{c.city}</i></span>)}</div>
    <div className="bd-cities">{CITIES.map(c=>{const has=built.cities.includes(c.id);return <article key={c.id} className={`bd-city${has?'':' lock'}`} aria-label={`${c.city} ${c.landmark}`}>
      <strong>{c.city} · {c.landmark}</strong><span className="bd-idx rt-num">{c.index}</span><small>{c.blurb}</small>
      {has?<span className="bd-done">정원에 있어요</span>:<button type="button" className="bd-go" disabled={coins<c.price} onClick={()=>onOpen(c.id)}>열기<em><Coin/>{c.price}</em></button>}</article>})}</div>
    <p className="jg-legal">지수 소개는 공부용이에요. 투자 권유가 아니에요.</p>
  </Sheet>;
}
