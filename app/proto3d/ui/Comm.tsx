'use client';
// 통신기 (B2C 기본, 2026-11-23; content/comm.ts): the merchant hands it over once, then it is a button on the screen.
// It opens the practice-account MTS over the garden, in the same look as /mts (app/mts/mts.css):
//   잔고   my garden's stocks (기록) and the coin stocks (코인) in one balance; coins are the deposit. A tap answers in
//          place with the two views (app/mts/StockSheet.tsx); the tree is one button further.
//   현재가 the merchant's five of the day (the same five all day)
//   주문   buy with coins (the day-before article read first, while the merchant is in: his hours are a game rule) or
//          sell a coin stock (the farmer loads the cart, paid at the next trading day's close). No real money or account.
import {useEffect,useMemo,useState} from 'react';
import '../../mts/mts.css';
import {StockSheet} from '../../mts/StockSheet';
import {rateOf} from '../../core/holdings-in';
import {dayBeforeArticle} from '../../content/village-news';
import type {CommAccount,CommLine} from '../../content/comm';

const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
const signed=(n:number)=>`${n>0?'+':''}${won(n)}`;
const pct=(n:number)=>`${n>0?'+':''}${n.toFixed(2)}%`;
const tone=(n:number)=>n>0?'up':n<0?'down':'flat';
export type CommTab='quote'|'order'|'balance';
const TABS:{id:CommTab;label:string}[]=[{id:'quote',label:'현재가'},{id:'order',label:'주문'},{id:'balance',label:'잔고'}];
type Cand={code:string;name:string;mkt:string;price:number|null;real:boolean};
type Lot={id:number;name:string;qty:number;price:number|null;rate:number|null};

function TabIcon({id}:{id:CommTab}){
  const p={width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  if(id==='quote')return <svg {...p}><path d="M4 18l5-6 4 3 7-9"/></svg>;
  if(id==='order')return <svg {...p}><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6M9 13h6"/></svg>;
  return <svg {...p}><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16"/></svg>;
}

export function Comm({acct,cands,lots,day,room,open,openNote,start='balance',onBuy,onSell,onTree,onClose}:{acct:CommAccount;cands:Cand[];lots:Lot[];day:string;room:number;
  open:boolean;openNote:string;start?:CommTab;onBuy:(code:string,qty:number)=>string|null;onSell:(lotId:number,qty:number)=>void;onTree:(id:number)=>void;onClose:()=>void}){
  const [tab,setTab]=useState<CommTab>(start),[side,setSide]=useState<'buy'|'sell'>('buy');void setSide;
  const [sheet,setSheet]=useState<string|null>(null),[pick,setPick]=useState<string|null>(null),[read,setRead]=useState<string[]>([]);
  const [qty,setQty]=useState(1),[msg,setMsg]=useState<string|null>(null),[lotId,setLotId]=useState<number|null>(null),[n,setN]=useState(0);
  const c=cands.find(x=>x.code===pick)??null,cost=c?.price!=null?c.price*qty:0,news=useMemo(()=>c?dayBeforeArticle(c,day):null,[c,day]);
  const lot=lots.find(l=>l.id===lotId)??null,line=sheet?acct.lines.find(l=>l.code===sheet)??null:null;
  useEffect(()=>{const w=window as {__proto3d?:Record<string,unknown>};(w.__proto3d??={}).comm={tab,side,sheet,lines:acct.lines.length,coins:acct.coins}},[tab,side,sheet,acct]);
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!sheet)onClose()};addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[sheet,onClose]);
  const toBuy=(code:string)=>{setTab('order');setSide('buy');setPick(code);setQty(1);setMsg(null)};

  const row=(l:CommLine)=>{const r=rateOf(l),gain=(l.lastPrice-l.avgPrice)*l.quantity;
    return <li key={l.kind+l.id} className="mts-row" data-code={l.code} data-kind={l.kind}>
      <button type="button" className="mts-row-btn" aria-label={`${l.name} 분석 보기`} onClick={()=>setSheet(l.code)}>
        <div className="mts-row-top">
          <div className="mts-name"><strong>{l.name}</strong><span className={`mts-mkt rt-comm-kind k-${l.kind}`}>{l.kind==='real'?'기록':'코인'}</span></div>
          <span className={`mts-num ${tone(gain)}`}>{signed(gain)}</span>
          <span className={`mts-num mts-rate ${tone(r)}`}>{pct(r)}</span>
        </div>
        <div className="mts-row-bottom"><span>{won(l.quantity)}주</span><span>{won(l.avgPrice)}</span><span>{won(l.lastPrice)}</span></div>
      </button>
    </li>};

  return <div className="rt-comm" role="dialog" aria-label="통신기">
    <div className="mts-shell"><div className="mts-phone">
      <header className="mts-top">
        <div className="mts-brand"><span className="mts-mark rt" aria-hidden><i/><i/></span><span>ReThink</span><span className="mts-pill">연습 계좌</span></div>
        <div className="mts-top-r"><span className="mts-demo" role="note">게임 코인 · 실제 주문 아님</span>
          <button type="button" className="rt-comm-x" aria-label="통신기 닫기" onClick={onClose}>✕</button></div>
      </header>

      {tab==='balance'&&<main className="mts-main" aria-label="잔고">
        <div className="mts-acct"><span>통신기</span><span>연습 계좌 · 게임 코인</span></div>
        <section className="mts-sum" aria-label="계좌 요약">
          <div className="mts-sum-k">총 평가금액</div>
          <div className="mts-sum-v">{won(acct.total)}<small>원</small></div>
          <div className="mts-sum-grid">
            <div><span>평가손익</span><strong className={tone(acct.pl)}>{signed(acct.pl)}</strong></div>
            <div><span>수익률</span><strong className={tone(acct.rate)}>{pct(acct.rate)}</strong></div>
            <div><span>매입금액</span><strong>{won(acct.buy)}</strong></div>
            <div><span>코인</span><strong>{won(acct.coins)}</strong></div>
          </div>
        </section>
        <p className="mts-hint">종목을 누르면 회사 숫자와 주가 흐름을 바로 볼 수 있어요. 기록 종목은 정원에 적어 둔 실제 종목이라 여기서 사고팔지 않아요.</p>
        <div className="mts-head" aria-hidden>
          <div><span>종목명</span><span>평가손익</span><span>수익률</span></div>
          <div><span>보유수량</span><span>평균단가</span><span>현재가</span></div>
        </div>
        {acct.lines.length?<ul className="mts-list" aria-label="보유 종목">{acct.lines.map(row)}</ul>:<p className="mts-hint">아직 종목이 없어요.</p>}
        <p className="mts-foot">ReThink 연습 계좌입니다. 게임 코인으로만 주문하고 실제 계좌와 연결되지 않습니다. 시세는 실제 종목이면 한국거래소 종가, 그 밖은 모의 값이고 재무는 모의 값입니다. 투자 권유가 아닙니다.</p>
      </main>}

      {tab==='quote'&&<main className="mts-main" aria-label="현재가">
        <div className="mts-acct"><span>오늘 들어온 종목</span><span>{day.replaceAll('-','.')} · 하루 종일 같은 다섯</span></div>
        <ul className="mts-list" aria-label="오늘 들어온 종목">{cands.map(x=><li key={x.code} className="mts-row">
          <button type="button" className="mts-row-btn" aria-label={`${x.name} 주문하기`} onClick={()=>toBuy(x.code)}>
            <div className="mts-row-top"><div className="mts-name"><strong>{x.name}</strong><span className="mts-mkt">{x.mkt==='KOSDAQ'?'코스닥':'코스피'}</span></div>
              <span className="mts-num">{x.price!=null?won(x.price):'-'}</span><span className="mts-num mts-rate flat">{x.real?'실제 종가':'모의 시세'}</span></div>
          </button></li>)}</ul>
        <p className="mts-foot">값은 실제 종목의 전 거래일 종가를 따라가요. 누르면 주문 화면으로 가요.</p>
      </main>}

      {tab==='order'&&<main className="mts-main rt-comm-order" aria-label="주문">
        {/* 피드백 11-25 "상인 매도는 없애, 농부가 하는 거": the communicator only buys; selling is the farmer's (수레) */}
        <p className="rt-comm-msg rt-comm-farmer">파는 건 농부 아저씨한테 가서 해요. 수레 옆에 있어요.</p>
        {msg&&<p className="rt-comm-msg" role="status">{msg}</p>}
        {side==='buy'&&(!open?<p className="mts-hint">{openNote}</p>
          :!c?<ul className="mts-list" aria-label="살 수 있는 종목">{cands.map(x=><li key={x.code} className="mts-row">
              <button type="button" className="mts-row-btn" onClick={()=>toBuy(x.code)}><div className="mts-row-top"><div className="mts-name"><strong>{x.name}</strong></div>
                <span className="mts-num">{x.price!=null?won(x.price):'-'}</span><span className="mts-num mts-rate flat">고르기</span></div></button></li>)}</ul>
          :<section className="rt-comm-form" aria-label={`${c.name} 매수`}>
            <button type="button" className="mts-link" onClick={()=>setPick(null)}>← 종목 고르기</button>
            <h3>{c.name} <small>{c.price!=null?won(c.price):'-'}원</small></h3>
            <article className="rt-comm-news" data-read={read.includes(c.code)}>
              <span>참고용 · 전날 뉴스 · {news!.theme} · 예시 기사</span><strong>{news!.title}</strong>
              {!read.includes(c.code)?<button type="button" className="mts-link" onClick={()=>setRead(r=>[...r,c.code])}>기사 읽기</button>
                :<>{/* RSS gives the publisher's short excerpt, not the body (사용자 2026-11-22): that is what 기사 읽기 opens */}<p className="vl-news-sum">{news!.summary??'이 기사는 요약이 없어요.'}</p>
                <small className="vl-news-src">언론사 요약 발췌 · 전문은 원문 링크에서 봐요</small></>}
            </article>
            <dl className="rt-comm-dl">
              <div><dt>수량</dt><dd><span className="vs-qty" role="group" aria-label="수량">
                <button type="button" aria-label="한 주 덜" onClick={()=>setQty(q=>Math.max(1,q-1))}>−</button><span>{qty}주</span>
                <button type="button" aria-label="한 주 더" onClick={()=>setQty(q=>q+1)}>+</button></span></dd></div>
              <div><dt>주문 금액</dt><dd>{won(cost)} 코인</dd></div>
              <div><dt>가진 코인</dt><dd>{won(acct.coins)}</dd></div>
            </dl>
            <button type="button" className="rt-comm-go buy" disabled={cost>acct.coins||room<=0||c.price==null}
              onClick={()=>{const r=onBuy(c.code,qty);setMsg(r)}}>
              {room<=0?'가상 밭에 빈칸이 없어요':cost>acct.coins?`코인 ${won(cost-acct.coins)} 부족`:`매수 주문 · 코인 ${won(cost)}`}</button>
          </section>)}
        {side==='sell'&&(!lot?<ul className="mts-list" aria-label="팔 수 있는 종목">{lots.map(l=><li key={l.id} className="mts-row">
            <button type="button" className="mts-row-btn" onClick={()=>{setLotId(l.id);setN(0);setMsg(null)}}><div className="mts-row-top"><div className="mts-name"><strong>{l.name}</strong></div>
              <span className="mts-num">{l.qty}주</span><span className={`mts-num mts-rate ${tone(l.rate??0)}`}>{l.rate!=null?pct(l.rate):'-'}</span></div></button></li>)}
            {!lots.length&&<li className="mts-hint">코인으로 산 종목이 없어요. 기록 종목은 여기서 팔지 않아요.</li>}</ul>
          :<section className="rt-comm-form" aria-label={`${lot.name} 매도`}>
            <button type="button" className="mts-link" onClick={()=>setLotId(null)}>← 종목 고르기</button>
            <h3>{lot.name} <small>{lot.price!=null?won(lot.price):'-'}원</small></h3>
            <label className="rt-comm-bar"><span>0</span><input type="range" min={0} max={lot.qty} step={1} value={n} aria-label="매도 수량" onChange={e=>setN(Number(e.target.value))}/><span>{lot.qty}</span></label>
            <p className="rt-comm-now" aria-live="polite">{n}주{lot.price!=null&&n>0?` · 오늘 값으로 ${won(lot.price*n)}어치`:''}</p>
            <p className="mts-hint">농부가 열매를 따서 수레에 실어요. 다음 거래일 종가로 팔리고 그때 코인이 들어와요.</p>
            <button type="button" className="rt-comm-go sell" disabled={n<1} onClick={()=>onSell(lot.id,n)}>{n<1?'수량을 골라요':`매도 주문 · ${n}주`}</button>
          </section>)}
      </main>}

      <nav className="mts-tabs" aria-label="아래 메뉴">{TABS.map(t=><button key={t.id} type="button" className={tab===t.id?'on':''} aria-current={tab===t.id?'page':undefined}
        onClick={()=>{setTab(t.id);setMsg(null)}}><TabIcon id={t.id}/><span>{t.label}</span></button>)}</nav>
      {line&&<StockSheet line={line} today={day} more="나무로 가기" onMore={()=>{setSheet(null);onTree(line.id)}} onClose={()=>setSheet(null)}/>}
    </div></div>
  </div>;
}
