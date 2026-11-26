'use client';
// 유저 워크플로우 (PM 2026-11-21, docs/user-workflow.md): what sits over the village for its people.
//   VillagerTalk   the talk box when I stand face to face with someone (the same box as 보리's, rethink.css .rt-talk)
//   WalkGuide      the first walk's goal at the top: who to go to next and why
//   Communicator   4장 the merchant's communicator: today's five, the day before's news on each, quantity and coins
//   Harvest        4장 the farmer's 가상 종목 매도: a stock, a quantity bar from 0 to all, and the cart's labels
//   NewsBoard      6장 the board on the square: today's articles on my holdings by theme
//   TreeStatus     3장 a tree's status, read only: bought when, average price, return, worth now, the company
import {useEffect,useMemo,useRef,useState} from 'react';
import {pagesOf} from '../../core/talk';
import {screenPoints} from '../screen';
import {Sheet} from './Sheet';
import {won} from '../../core/won';
import {THEMES,articlesFor,dayBeforeArticle,overviewOf,type Theme} from '../../content/village-news';
import type {CartLoad} from '../../core/walk';
import {ROLE_TAG} from '../../content/villagers';

export type Choice={label:string;go:()=>void};
// 피드백 2026-11-22 (UI 피드백): one or two sentences a bubble (core/talk.ts); "계속" (or a tap on the bubble) shows the
// next, and the answers come with the last. The buttons sit on the bubble itself. e2e: window.__talkAll shows it whole.
export function TalkBox({name,who,role,line,choices,className,nameWho,onLeave}:{name:string;who?:string;role?:string;line:string;choices:Choice[];className?:string;nameWho?:string;onLeave?:()=>void}){
  const pages=useMemo(()=>(window as unknown as {__talkAll?:boolean}).__talkAll?[line]:pagesOf(line),[line]);
  const [n,setN]=useState(0);useEffect(()=>setN(0),[line]);
  const i=Math.min(n,pages.length-1),more=i<pages.length-1;
  return <div className={'rt-talk '+(className??'')} role="dialog" aria-label={name} data-villager={who}>
    <div className="rt-talk-box" data-more={more} onClick={e=>{if(more&&e.target===e.currentTarget)setN(i+1)}}>
      {/* 피드백 2026-11-25 "심플, 깔끔": the role tag is gone (the name says enough), and closing is a small × on the box */}
      {onLeave&&<button type="button" className="rt-talk-x" aria-label="대화 닫기" onClick={onLeave}>×</button>}
      <span className="rt-talk-name" data-who={nameWho} data-role={role}>{name}</span>
      <p className="rt-talk-line" aria-live="polite" onClick={()=>{if(more)setN(i+1)}}>{pages[i]}</p>
      <div className="rt-talk-choices on-box" role="group" aria-label="대답">
        {/* 피드백 2026-11-25: a way back to the bubble before */}
        {i>0?<button type="button" className="rt-talk-choice rt-talk-prev" onClick={()=>setN(i-1)}>‹ 이전</button>:pages.length>1&&<span className="rt-talk-page rt-num" aria-hidden>{i+1}/{pages.length}</span>}
        {more?<button type="button" className="rt-talk-choice first rt-talk-next" onClick={()=>setN(i+1)}>계속</button>
          :choices.map((c,k)=><button key={c.label} type="button" className={'rt-talk-choice'+(k===0?' first':'')} onClick={c.go}>{c.label}</button>)}</div></div>
  </div>;
}
export function VillagerTalk({name,who,role,line,choices,onLeave}:{name:string;who?:string;role?:string;line:string;choices:Choice[];onLeave?:()=>void}){
  return <TalkBox className="vl-villager" name={name} who={who} role={role} line={line} choices={choices} onLeave={onLeave} nameWho={who==='bori'||who==='naru'?who:undefined}/>;
}

export function WalkGuide({who,what,n,total}:{who:string;what:string;n:number;total:number}){
  return <div className="vl-guide" role="status" aria-label="마을 첫 산책">
    <span className="vl-guide-face" aria-hidden/>
    <p><b>{who}</b>에게 가 보자 <small>{what}</small></p><span className="vl-guide-n rt-num">{n}/{total}</span>
  </div>;
}

type Cand={code:string;name:string;mkt:string;price:number|null;real:boolean};
export function Communicator({cands,day,coins,room,onBuy,onClose}:{cands:Cand[];day:string;coins:number;room:number;
  onBuy:(code:string,qty:number)=>string|null;onClose:()=>void}){
  const [pick,setPick]=useState<string|null>(null),[read,setRead]=useState<string[]>([]),[qty,setQty]=useState(1),[msg,setMsg]=useState<string|null>(null);
  const c=cands.find(x=>x.code===pick)??null,news=c?dayBeforeArticle(c,day):null,cost=c?.price!=null?c.price*qty:0;
  return <Sheet kicker="상인의 통신기" title={pick&&c?c.name:'오늘 들어온 종목 5'} label="상인의 통신기" onClose={onClose}
    foot={c&&<button type="button" className="rt-btn primary wide" disabled={!read.includes(c.code)||cost>coins||room<=0}
      onClick={()=>{const r=onBuy(c.code,qty);setMsg(r)}}>
      {room<=0?'가상 밭에 빈칸이 없어요':!read.includes(c.code)?'전날 뉴스를 먼저 읽어요':cost>coins?`코인 ${won(cost-coins)} 부족`:`주문 확인 · 코인 ${won(cost)}`}</button>}>
    <p className="rt-hint">매일 실제 종목 다섯 개가 들어와요. 같은 날엔 같은 다섯 개예요. 가상 종목은 게임 코인으로 사고, 값은 실제 종목 등락률을 따라가요. 실제 종목 밭은 기록만 하니까, 사고팔기는 여기서 해 봐요.</p>
    {msg&&<p className="vs-msg" role="status">{msg}</p>}
    {!c?<ul className="vs-list vl-cands">{cands.map(x=><li key={x.code} className="vs-row">
      <button type="button" className="vl-cand" onClick={()=>{setPick(x.code);setQty(1);setMsg(null)}}>
        <span className="vs-name"><strong>{x.name}</strong><small>{x.mkt} · {x.real?'실제 종가':'모의 시세'}</small></span>
        <b className="rt-num vs-price">{x.price!=null?won(x.price):'-'}</b></button></li>)}</ul>
    :<div className="vl-cand-detail">
      <button type="button" className="rt-btn ghost" onClick={()=>setPick(null)}>← 다섯 종목으로</button>
      <article className="vl-news" data-read={read.includes(c.code)}>
        <span className="vl-news-k">전날 뉴스 · {news!.theme} · 예시 기사</span>
        <h3>{news!.title}</h3><small>{news!.day.replaceAll('-','.')} · {c.name}</small>
        {!read.includes(c.code)&&<button type="button" className="rt-btn" onClick={()=>setRead(r=>[...r,c.code])}>기사 읽기</button>}
        {/* RSS gives the publisher's short excerpt, not the body (사용자 2026-11-22): that is what 기사 읽기 opens */}
        {read.includes(c.code)&&<><p className="vl-news-sum">{news!.summary??'이 기사는 요약이 없어요.'}</p>
          <small className="vl-news-src">언론사 요약 발췌 · 전문은 원문 링크에서 봐요</small></>}
      </article>
      <dl className="vl-order">
        <div><dt>가격</dt><dd className="rt-num">{c.price!=null?won(c.price):'-'}</dd></div>
        <div><dt>수량</dt><dd>{<span className="vs-qty" role="group" aria-label="수량">
          <button type="button" aria-label="한 주 덜" onClick={()=>setQty(q=>Math.max(1,q-1))}>−</button><span className="rt-num">{qty}주</span>
          <button type="button" aria-label="한 주 더" onClick={()=>setQty(q=>q+1)}>+</button></span>}</dd></div>
        <div><dt>코인</dt><dd className="rt-num">{won(cost)} · 지금 {won(coins)}</dd></div>
      </dl>
    </div>}
  </Sheet>;
}

type Lot={id:number;name:string;qty:number;price:number|null};
export function Harvest({lots,cart,today,onLoad,onClose}:{lots:Lot[];cart:CartLoad[];today:string;
  onLoad:(lotId:number,qty:number)=>void;onClose:()=>void}){
  const [pick,setPick]=useState<number|null>(lots.length===1?lots[0].id:null),[n,setN]=useState(0);
  const l=lots.find(x=>x.id===pick)??null,max=l?l.qty:0;
  const waitingLoads=cart.filter(c=>c.paid==null&&!c.practice);
  return <Sheet kicker="농부 · 가상 종목 매도" title={l?l.name:'어느 나무 열매를 딸까?'} label="가상 종목 매도" onClose={onClose}
    foot={l&&<button type="button" className="rt-btn primary wide" disabled={n<1} onClick={()=>onLoad(l.id,n)}>{n<1?'수량을 골라요':n===max?`전량 ${n}주 수확 확정`:`${n}주 수확 확정`}</button>}>
    <p className="rt-hint">몇 주 팔지 정하면 농부가 나무에서 열매를 따서 수레에 실어요. 수레는 다음 거래일 종가로 팔리고, 그때 코인이 들어와요.</p>
    {!l?<ul className="vs-list">{lots.map(x=><li key={x.id} className="vs-row"><button type="button" className="vl-cand" onClick={()=>{setPick(x.id);setN(0)}}>
      <span className="vs-name"><strong>{x.name}</strong><small>팔 수 있는 수량 {x.qty}주</small></span><b className="rt-num vs-price">{x.price!=null?won(x.price):'-'}</b></button></li>)}
      {!lots.length&&<li className="rt-hint">딸 수 있는 가상 나무가 없어요.</li>}</ul>
    :<div className="vl-harvest">
      <label className="vl-bar"><span className="rt-num">0</span>
        <input type="range" min={0} max={max} step={1} value={n} aria-label="매도 수량" onChange={e=>setN(Number(e.target.value))}/>
        <span className="rt-num">{max}</span></label>
      <p className="vl-bar-now rt-num" aria-live="polite">{n}주{l.price!=null&&n>0?` · 지금 값으로 ${won(l.price*n)}어치 (다음 거래일 종가로 팔려요)`:''}</p>
    </div>}
    {waitingLoads.length>0&&<><div className="rt-section">수레표</div><ul className="vl-tags">{waitingLoads.map(c=><li key={c.id}>
      <b>{c.name} {c.qty}주</b><span>정산 예정 {c.settleDay.slice(5).replace('-','.')}</span><em>정산 대기</em></li>)}</ul></>}
    <p className="rt-hint vl-today">오늘 {today.replaceAll('-','.')}</p>
  </Sheet>;
}

export function NewsBoard({stocks,day,onClose}:{stocks:{code:string;name:string}[];day:string;onClose:()=>void}){
  const all=articlesFor(stocks,day),[theme,setTheme]=useState<Theme|null>(null);
  const list=theme?all.filter(a=>a.theme===theme):all;
  return <Sheet kicker="뉴스 표지판" title={`오늘 배달된 소식 ${all.length}`} label="뉴스 표지판" onClose={onClose}>
    <p className="rt-hint">신문 배달이 매일 내 보유 종목 관련 기사를 모아 와요. 지금은 예시 기사예요.</p>
    <div className="rt-seg vl-themes" role="tablist" aria-label="테마">
      <button type="button" role="tab" aria-selected={theme===null} onClick={()=>setTheme(null)}>전체</button>
      {THEMES.map(t=><button key={t} type="button" role="tab" aria-selected={theme===t} onClick={()=>setTheme(t)}>{t} {all.filter(a=>a.theme===t).length}</button>)}</div>
    {list.length?<ul className="vl-articles">{list.map(a=><li key={a.id}><span className="vl-news-k">{a.theme} · 예시 기사</span><strong>{a.title}</strong>
      {a.summary&&<p className="vl-news-sum">{a.summary}</p>}
      <small>{a.name} · {a.day.replaceAll('-','.')}</small></li>)}</ul>
    :<p className="vl-empty">{!stocks.length?'보유 종목이 없어서 배달된 기사가 없어요. 밭에 종목이 생기면 그 소식을 모아 올게요.':theme?`오늘은 ${theme} 기사가 없어요.`:'오늘은 내 종목 관련 기사가 없어요.'}</p>}
  </Sheet>;
}

export function TreeStatus({h,price,onClose}:{h:{name:string;code?:string;price:number;quantity:number;date:string;rate:number;virtual?:boolean};price:number|null;onClose:()=>void}){
  const worth=Math.round(h.price*(1+h.rate/100)*h.quantity);
  return <Sheet kicker={h.virtual?'가상 종목 · 상태':'실제 종목 · 상태'} title={h.name} label={`${h.name} 상태`} onClose={onClose} compact>
    <dl className="vl-status">
      <div><dt>매수 시점</dt><dd className="rt-num">{h.date.replaceAll('-','.')}</dd></div>
      <div><dt>평단가</dt><dd className="rt-num">{won(h.price)}</dd></div>
      <div><dt>수익률</dt><dd className={'rt-num '+(h.rate>0?'up':h.rate<0?'down':'')}>{h.rate>0?'+':''}{h.rate}%</dd></div>
      <div><dt>보유액수</dt><dd className="rt-num">{won(worth)} <small>{h.quantity}주{price!=null?` · 지금 ${won(price)}`:''}</small></dd></div>
    </dl>
    <div className="rt-section">기업 개요</div>
    <p className="vl-overview">{overviewOf(h.code,h.name)}</p>
    <p className="rt-hint">나무 크기는 지금 보유액수만큼, 잎과 열매는 수익률만큼 달라져요. 이 창은 보기만 해요.</p>
  </Sheet>;
}

// the people's name tags over their heads (role names); the one to go to now stands out. A tap is a tap on the person.
export function VillagerTags({items,onPick}:{items:{id:string;name:string;hl:boolean;note?:string|null}[];onPick:(id:string)=>void}){
  const refs=useRef(new Map<string,HTMLButtonElement>());
  useEffect(()=>{let raf=0;const tick=()=>{for(const [id,el] of refs.current){const p=screenPoints.get('npctag-'+id);
      if(!p||!p.visible||p.y<60){el.style.visibility='hidden';continue}el.style.visibility='visible';el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`}
    raf=requestAnimationFrame(tick)};tick();return()=>cancelAnimationFrame(raf)},[]);
  return <>{items.map(t=><button key={t.id} type="button" className="vl-npc-tag" data-npc={t.id} data-hl={t.hl} style={{visibility:'hidden'}} aria-label={`${t.name}에게 말 걸기`}
    ref={el=>{if(el)refs.current.set(t.id,el);else refs.current.delete(t.id)}} onClick={()=>onPick(t.id)}>{t.name}{(t.note??ROLE_TAG[t.id])&&<small>{t.note??ROLE_TAG[t.id]}</small>}</button>)}</>;
}
