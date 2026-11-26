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
import '../comm-plus.css';
import {StockSheet} from '../../mts/StockSheet';
import {rateOf} from '../../core/holdings-in';
import {mergeNews,type NewsCard} from '../../content/village-news';
import {useLiveNews} from '../liveNews';
import type {CommAccount,CommLine} from '../../content/comm';
import {Term,CommGuide,guideSeen,markGuide,Spark,StockPage,Missions,Fields,WeeklyCard,FirstBuyCards,firstBuySeen,markFirstBuy,type Mission,type Weekly} from './CommPlus';
import {history,change,quote} from '../../core/virtual';

const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
const signed=(n:number)=>`${n>0?'+':''}${won(n)}`;
const pct=(n:number)=>`${n>0?'+':''}${n.toFixed(2)}%`;
const tone=(n:number)=>n>0?'up':n<0?'down':'flat';
export type CommTab='quote'|'news'|'order'|'balance';
const TABS:{id:CommTab;label:string}[]=[{id:'quote',label:'현재가'},{id:'news',label:'뉴스'},{id:'order',label:'주문'},{id:'balance',label:'잔고'}];
type Cand={code:string;name:string;mkt:string;price:number|null;real:boolean};
type Lot={id:number;name:string;qty:number;price:number|null;rate:number|null};

function TabIcon({id}:{id:CommTab}){
  const p={width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  if(id==='quote')return <svg {...p}><path d="M4 18l5-6 4 3 7-9"/></svg>;
  if(id==='news')return <svg {...p}><rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 9h3v8a2 2 0 0 1-2 2M7 9h6M7 13h6M7 16h4"/></svg>;
  if(id==='order')return <svg {...p}><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6M9 13h6"/></svg>;
  return <svg {...p}><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16"/></svg>;
}

// the day of the latest close a price stands on, as M/D
const closeDay=(code:string)=>{const q=quote(code,new Date().toISOString().slice(0,10));return q?`${+q.day.slice(5,7)}/${+q.day.slice(8)}`:'-'};
export function Comm({acct,cands,lots,day,room,open,openNote,start='balance',onBuy,onSell,onTree,onClose,missions=[],onClaim,onRead,onChart,weekly,onWeekly}:{acct:CommAccount;cands:Cand[];lots:Lot[];day:string;room:number;
  open:boolean;openNote:string;start?:CommTab;onBuy:(code:string,qty:number)=>string|null;onSell:(lotId:number,qty:number)=>void;onTree:(id:number)=>void;onClose:()=>void;missions?:Mission[];onClaim?:(id:string)=>void;onRead?:()=>void;onChart?:()=>void;weekly?:Weekly;onWeekly?:()=>void}){
  const [tab,setTab]=useState<CommTab>(start),[side,setSide]=useState<'buy'|'sell'>('buy');
  const [sheet,setSheet]=useState<string|null>(null),[pick,setPick]=useState<string|null>(null);
  const [qty,setQty]=useState(1),[msg,setMsg]=useState<string|null>(null),[lotId,setLotId]=useState<number|null>(null),[n,setN]=useState(0);
  const c=cands.find(x=>x.code===pick)??null,cost=c?.price!=null?c.price*qty:0;
  // 피드백 2026-11-26: the news is its own tab, read when I want (no longer a gate in front of 매수)
  // 실제 기사 (db/functions/news-feed) where the server answers, 모의 기사 for the rest
  const newsStocks=useMemo(()=>[...cands,...acct.lines.filter(l=>l.kind==='real').map(l=>({code:l.code,name:l.name}))].filter((x,i,a)=>a.findIndex(y=>y.code===x.code)===i).map(x=>({code:x.code,name:x.name})),[cands,acct.lines]);
  const live=useLiveNews(newsStocks);
  const news=useMemo(()=>mergeNews(newsStocks,day,live),[newsStocks,day,live]);
  const anyLive=news.some(a=>a.live),anyMock=news.some(a=>!a.live);
  const [first,setFirst]=useState<{name:string;price:number}|null>(null),[art,setArt]=useState<NewsCard|null>(null),[confirm,setConfirm]=useState<null|{side:'buy'|'sell'}>(null),[booting,setBooting]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>setBooting(false),900);return()=>clearTimeout(t)},[]);
  const readArt=(a:NewsCard)=>{setArt(a);onRead?.()};
  const [clock,setClock]=useState(()=>new Date());useEffect(()=>{const t=setInterval(()=>setClock(new Date()),20000);return()=>clearInterval(t)},[]);
  const lot=lots.find(l=>l.id===lotId)??null,line=sheet?acct.lines.find(l=>l.code===sheet)??null:null;
  useEffect(()=>{const w=window as {__proto3d?:Record<string,unknown>};(w.__proto3d??={}).comm={tab,side,sheet,lines:acct.lines.length,coins:acct.coins,news:news.length,art:art?.id??null,confirm:confirm?.side??null}},[tab,side,sheet,acct,news,art,confirm]);
  useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key!=='Escape'||sheet)return;if(confirm)setConfirm(null);else if(art)setArt(null);else onClose()};addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[sheet,onClose,confirm,art]);
  const toBuy=(code:string)=>{setPage(null);setTab('order');setSide('buy');setPick(code);setQty(1);setMsg(null)};
  // 피드백 2026-11-26: the first time, four cards; "?" brings them back. A stock's own page from 현재가.
  const [guide,setGuide]=useState(()=>!guideSeen()),[page,setPage]=useState<string|null>(null);
  const pc=page?cands.find(x=>x.code===page)??null:null;
  useEffect(()=>{if(page)onChart?.()},[page]);// eslint-disable-line react-hooks/exhaustive-deps

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

  const hm=`${clock.getHours()}:${String(clock.getMinutes()).padStart(2,'0')}`;
  // 피드백 2026-11-26 "통신기 눌렀을 때 휴대폰이 등장하면서 주식앱이 켜지게": a phone rises from the bottom, its screen wakes
  // and the app's splash fades into the app
  return <div className="rt-comm" role="dialog" aria-label="모의투자" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="rt-phone"><span className="rt-phone-btn a" aria-hidden/><span className="rt-phone-btn b" aria-hidden/><span className="rt-phone-btn c" aria-hidden/>
    <div className="rt-phone-screen">
    <div className="rt-phone-status" aria-hidden><span>{hm}</span><i className="rt-phone-island"/><span className="rt-phone-ic">
      <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
      <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 10.5l2.2-2.6a3.2 3.2 0 0 0-4.4 0zM3.6 6.2a5.6 5.6 0 0 1 7.8 0l1.3-1.5a7.7 7.7 0 0 0-10.4 0zM.9 3.1a9.6 9.6 0 0 1 13.2 0L15.4 1.6A11.6 11.6 0 0 0-.4 1.6z"/></svg>
      <span className="rt-phone-bat"><i/></span></span></div>
    <div className="mts-shell"><div className="mts-phone">
      <header className="mts-top">
        <div className="mts-brand"><span className="mts-mark rt" aria-hidden><i/><i/></span><span>ReThink</span><span className="mts-pill">연습 계좌</span></div>
        <div className="mts-top-r"><span className="mts-demo" role="note">게임 코인 · 실제 주문 아님</span>
          <button type="button" className="rt-comm-help" aria-label="모의투자 사용법" onClick={()=>setGuide(true)}>?</button>
          <button type="button" className="rt-comm-x" aria-label="모의투자 닫기" onClick={onClose}>✕</button></div>
      </header>

      {tab==='balance'&&<main className="mts-main" aria-label="잔고">
        <div className="mts-acct"><span>모의투자</span><span>연습 계좌 · 게임 코인</span></div>
        <section className="mts-sum" aria-label="계좌 요약">
          <div className="mts-sum-k"><Term k="총 평가금액"/></div>
          <div className="mts-sum-v">{won(acct.total)}<small>원</small></div>
          <div className="mts-sum-grid">
            <div><span><Term k="평가손익"/></span><strong className={tone(acct.pl)}>{signed(acct.pl)}</strong></div>
            <div><span><Term k="수익률"/></span><strong className={tone(acct.rate)}>{pct(acct.rate)}</strong></div>
            <div><span><Term k="매입금액"/></span><strong>{won(acct.buy)}</strong></div>
            <div><span><Term k="예수금">코인</Term></span><strong>{won(acct.coins)}</strong></div>
          </div>
        </section>
        {weekly&&<WeeklyCard w={weekly} onClaim={()=>onWeekly?.()}/>}
        <Fields/>
        {onClaim&&<Missions list={missions} onClaim={onClaim}/>}
        <div className="mts-head" aria-hidden>
          <div><span>종목명</span><span><Term k="평가손익"/></span><span><Term k="수익률"/></span></div>
          <div><span><Term k="보유수량"/></span><span><Term k="평균단가"/></span><span><Term k="현재가"/></span></div>
        </div>
        {acct.lines.length?<ul className="mts-list" aria-label="보유 종목">{acct.lines.map(row)}</ul>:<p className="mts-hint">아직 종목이 없어요.</p>}
        <p className="mts-foot">ReThink 연습 계좌입니다. 게임 코인으로만 주문하고 실제 계좌와 연결되지 않습니다. 시세는 실제 종목이면 한국거래소 종가, 그 밖은 모의 값이고 재무는 모의 값입니다. 투자 권유가 아닙니다.</p>
      </main>}

      {tab==='quote'&&<main className="mts-main" aria-label="현재가">
        <div className="mts-acct"><span>오늘 들어온 종목</span><span>{day.replaceAll('-','.')} · 하루 종일 같은 다섯</span></div>
        <div className="mts-head" aria-hidden><div><span>종목명</span><span><Term k="현재가"/></span><span><Term k="등락률"/></span></div></div>
        <ul className="mts-list" aria-label="오늘 들어온 종목">{cands.map(x=>{const ch=change(x.code,day);return <li key={x.code} className="mts-row">
          <button type="button" className="mts-row-btn" aria-label={`${x.name} 현재가 보기`} onClick={()=>setPage(x.code)}>
            <div className="mts-row-top"><div className="mts-name"><strong>{x.name}</strong><span className="mts-mkt">{x.mkt==='KOSDAQ'?'코스닥':'코스피'}</span></div>
              <Spark bars={history(x.code,day,22)}/>
              <span className="mts-num">{x.price!=null?won(x.price):'-'}</span><span className={`mts-num mts-rate ${tone(ch?.rate??0)}`}>{ch?pct(ch.rate):'-'}</span></div>
          </button></li>})}</ul>
        <p className="mts-foot">값은 실제 종목의 전 거래일 종가를 따라가요. 누르면 차트와 호가를 볼 수 있어요.</p>
      </main>}

      {tab==='order'&&<main className="mts-main rt-comm-order" aria-label="주문">
        <div className="rt-comm-side" role="tablist" aria-label="주문 종류">
          {(['buy','sell'] as const).map(s=><button key={s} type="button" role="tab" aria-selected={side===s} className={`s-${s}`} onClick={()=>{setSide(s);setMsg(null)}}>{s==='buy'?'매수 (사기)':'매도 (팔기)'}</button>)}</div>
        {msg&&<p className="rt-comm-msg" role="status">{msg}</p>}
        {side==='buy'&&(!open?<p className="mts-hint">{openNote}</p>
          :!c?<ul className="mts-list" aria-label="살 수 있는 종목">{cands.map(x=><li key={x.code} className="mts-row">
              <button type="button" className="mts-row-btn" onClick={()=>toBuy(x.code)}><div className="mts-row-top"><div className="mts-name"><strong>{x.name}</strong></div>
                <span className="mts-num">{x.price!=null?won(x.price):'-'}</span><span className="mts-num mts-rate flat">고르기</span></div></button></li>)}</ul>
          :<section className="rt-comm-form" aria-label={`${c.name} 매수`}>
            <button type="button" className="mts-link" onClick={()=>setPick(null)}>← 종목 고르기</button>
            <h3>{c.name} <small>{c.price!=null?won(c.price):'-'}원</small></h3>
            {(()=>{const rel=news.filter(a=>a.code===c.code);return rel.length?<button type="button" className="rt-ord-news" onClick={()=>readArt(rel[0])}>
              <span>📰 관련 뉴스 {rel.length}건</span><b>{rel[0].title}</b></button>:null})()}
            <dl className="rt-comm-dl">
              <div><dt>수량</dt><dd><span className="vs-qty" role="group" aria-label="수량">
                <button type="button" aria-label="한 주 덜" onClick={()=>setQty(q=>Math.max(1,q-1))}>−</button><span>{qty}주</span>
                <button type="button" aria-label="한 주 더" onClick={()=>setQty(q=>q+1)}>+</button></span></dd></div>
              <div><dt>주문 종류</dt><dd><span className="rt-ord-kind"><b><Term k="시장가"/></b><span className="off" title="연습 계좌는 다음 장 마감 값으로 체결돼요"><Term k="지정가"/></span></span></dd></div>
              <div><dt>주문 금액</dt><dd>{won(cost)} 코인</dd></div>
              <div><dt><Term k="예수금">매수 가능</Term></dt><dd>{won(acct.coins)} · 최대 {c.price?Math.floor(acct.coins/c.price):0}주</dd></div>
            </dl>
            <div className="rt-ord-pct" role="group" aria-label="빠른 수량">{[10,25,50,100].map(p=><button key={p} type="button" onClick={()=>{const mx=c.price?Math.floor(acct.coins/c.price):0;setQty(Math.max(1,Math.floor(mx*p/100)))}}>{p===100?'최대':`${p}%`}</button>)}</div>
            {/* 피드백 2026-11-26 "수익률이 안 바뀌어": what really happens: bought at once at the latest close; the rate moves when the next close comes in */}
            <p className="rt-ord-when">⏱ <Term k="체결"/>: 가장 최근 종가({closeDay(c.code)})로 바로 사요. 수익률은 다음 장 마감(15:30) 값이 들어오면 바뀌어요.</p>
            <button type="button" className="rt-comm-go buy" disabled={cost>acct.coins||room<=0||c.price==null}
              onClick={()=>setConfirm({side:'buy'})}>
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
            <button type="button" className="rt-comm-go sell" disabled={n<1} onClick={()=>setConfirm({side:'sell'})}>{n<1?'수량을 골라요':`매도 주문 · ${n}주`}</button>
          </section>)}
      </main>}

      {tab==='news'&&<main className="mts-main rt-news" aria-label="뉴스">
        <div className="mts-acct"><span>종목 뉴스</span><span>오늘 후보 · 내 종목</span></div>
        {anyMock&&<p className="rt-news-note">⚠︎ {anyLive?'"모의" 표시가 붙은 기사는 연습용으로 만든 글이에요. 실제 회사 소식이 아니에요.':'모의 기사예요. 실제 뉴스를 불러오지 못해 연습용으로 만든 기사이고 실제 회사 소식이 아니에요.'}</p>}
        <ul className="rt-news-list">{news.map(a=>{const ch=change(a.code,day);return <li key={a.id}>
          <button type="button" className="rt-news-row" onClick={()=>readArt(a)}>
            <span className="rt-news-meta"><b className={`t-${a.theme}`}>{a.theme}</b>{a.press} · {a.time}{!a.live&&anyLive&&' · 모의'}</span>
            <strong>{a.title}</strong>
            <span className="rt-news-stock">{a.name}{ch&&<em className={tone(ch.rate)}>{pct(ch.rate)}</em>}</span>
          </button></li>})}</ul>
      </main>}

      <nav className="mts-tabs" aria-label="아래 메뉴">{TABS.map(t=><button key={t.id} type="button" className={tab===t.id?'on':''} aria-current={tab===t.id?'page':undefined}
        onClick={()=>{setTab(t.id);setMsg(null)}}><TabIcon id={t.id}/><span>{t.label}</span></button>)}</nav>
      {pc&&<StockPage name={pc.name} mkt={pc.mkt} bars={history(pc.code,day,60)} onBuy={()=>toBuy(pc.code)} canSell={lots.some(l=>l.name===pc.name)}
        onSell={()=>{const l=lots.find(x=>x.name===pc.name);setPage(null);setTab('order');setSide('sell');if(l){setLotId(l.id);setN(0)}}} onClose={()=>setPage(null)}/>}
      {art&&<ArticleView a={art} ch={change(art.code,day)} onClose={()=>setArt(null)} onStock={()=>{setArt(null);setPage(art.code)}}
        onOrder={cands.some(x=>x.code===art.code)?()=>{setArt(null);toBuy(art.code)}:undefined}/>}
      {confirm&&confirm.side==='buy'&&c&&<OrderConfirm side="buy" name={c.name} qty={qty} price={c.price} onCancel={()=>setConfirm(null)}
        onOk={()=>{setConfirm(null);const r=onBuy(c.code,qty);setMsg(r);if(r?.includes('샀어요')&&!firstBuySeen()&&c.price!=null)setFirst({name:c.name,price:c.price})}}/>}
      {first&&<FirstBuyCards name={first.name} price={first.price} onDone={()=>{markFirstBuy();setFirst(null)}}/>}
      {confirm&&confirm.side==='sell'&&lot&&<OrderConfirm side="sell" name={lot.name} qty={n} price={lot.price} onCancel={()=>setConfirm(null)}
        onOk={()=>{setConfirm(null);onSell(lot.id,n)}}/>}
      {booting&&<div className="rt-phone-splash" aria-hidden><span className="mts-mark rt"><i/><i/></span><b>ReThink</b><small>연습 계좌</small></div>}
      {guide&&<CommGuide onDone={()=>{markGuide();setGuide(false)}}/>}
      {line&&<StockSheet line={line} today={day} more="나무로 가기" onMore={()=>{setSheet(null);onTree(line.id)}} onClose={()=>setSheet(null)}/>}
    </div></div>
    <i className="rt-phone-home" aria-hidden/>
    </div></div>
  </div>;
}

// an article inside the app: publisher and time, the headline, the body, what to look at, the related stock
function ArticleView({a,ch,onClose,onStock,onOrder}:{a:NewsCard;ch:{rate:number}|null;onClose:()=>void;onStock:()=>void;onOrder?:()=>void}){
  return <div className="rt-art" role="dialog" aria-label={a.title}>
    <header className="rt-sp-top"><button type="button" className="mts-link" aria-label="뉴스 닫기" onClick={onClose}>←</button><div><b>뉴스</b></div><span/></header>
    <article className="rt-art-body">
      <span className="rt-news-meta"><b className={`t-${a.theme}`}>{a.theme}</b>{a.press} · {a.time}</span>
      <h3>{a.title}</h3>
      {a.body.map((p,i)=><p key={i}>{p}</p>)}
      <small className="rt-art-src">{a.live?'언론사 요약 발췌 · 전문은 원문에서 봐요':'모의 기사 · 연습용으로 만든 글이에요. 실제 회사 소식이 아니에요.'}</small>
      {a.live&&a.url&&<a className="rt-art-link" href={a.url} target="_blank" rel="noopener noreferrer">원문 보기 ↗</a>}
      <aside className="rt-art-look"><b>📌 이 기사에서 볼 것</b><p>{a.look}</p></aside>
    </article>
    <div className="rt-art-stock"><button type="button" onClick={onStock}><span>관련 종목</span><b>{a.name}</b>{ch&&<em className={tone(ch.rate)}>{pct(ch.rate)}</em>}<i>차트 ›</i></button>
      {onOrder&&<button type="button" className="rt-comm-go buy" onClick={onOrder}>주문하기</button>}</div>
  </div>;
}

// the check before an order goes in, as a broker app asks
function OrderConfirm({side,name,qty,price,onOk,onCancel}:{side:'buy'|'sell';name:string;qty:number;price:number|null;onOk:()=>void;onCancel:()=>void}){
  const buy=side==='buy';
  return <div className="rt-oc" role="alertdialog" aria-label={buy?'매수 주문 확인':'매도 주문 확인'}><div className="rt-oc-card">
    <h4 className={buy?'up':'down'}>{buy?'매수':'매도'} 주문 확인</h4>
    <dl><div><dt>종목</dt><dd>{name}</dd></div><div><dt>주문 종류</dt><dd><Term k="시장가"/></dd></div><div><dt>수량</dt><dd>{won(qty)}주</dd></div>
      <div><dt>현재가</dt><dd>{price!=null?won(price):'-'}원</dd></div><div><dt>예상 금액</dt><dd><b>{price!=null?won(price*qty):'-'} 코인</b></dd></div>
      <div><dt><Term k="체결"/></dt><dd>{buy?'가장 최근 종가로 바로':'다음 거래일 15:30 종가'}</dd></div></dl>
    <p className="rt-oc-note">체결 값은 지금 값과 다를 수 있어요. 게임 코인으로만 주문돼요.</p>
    <div className="rt-oc-acts"><button type="button" className="rt-oc-no" onClick={onCancel}>취소</button>
      <button type="button" className={`rt-comm-go ${side}`} onClick={onOk}>{buy?'매수':'매도'} 확인</button></div>
  </div></div>;
}
