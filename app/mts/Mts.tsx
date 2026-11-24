'use client';
// The MTS (멘토링 2026-11-22), two ways (mode):
//   practice (/mts): ReThink's own practice account for people who have not invested yet (B2C, 10대·사회 초년생).
//   broker (/mts?demo=broker): ReThink embedded in a made-up brokerage app, for showing the tie-in.
// The balance shows a seeded KOSDAQ account (content/broker/demo-account.ts) with our model badges beside each stock
// (content/broker/badges.ts). Tapping a stock or its badge answers in place: a sheet with the books and the price path
// side by side (StockSheet.tsx). The garden is one step further: "보유종목 점검" or the sheet's button opens ReThink in a
// full-screen web view (/?embed=mts) and hands it the balance over postMessage (core/embed.ts), nothing captured or typed. Only the layout every MTS shares is used (the five
// bottom tabs, the balance columns, red up / blue down); no real broker's name, logo, colours or icons. There is no
// order function: the 주문 tab is a disabled place-holder. Every screen says "가상 증권사 데모 화면".
import {useEffect,useMemo,useRef,useState} from 'react';
import {BROKER,DEMO_ACCOUNT,toStd,type DemoLine} from '../content/broker/demo-account';
import {badgesFor} from '../content/broker/badges';
import {holdingsMsg,isReadyMsg} from '../core/embed';
import {rateOf} from '../core/holdings-in';
import {StockSheet} from './StockSheet';

const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
const signed=(n:number)=>`${n>0?'+':''}${won(n)}`;
const pct=(n:number)=>`${n>0?'+':''}${n.toFixed(2)}%`;
const tone=(n:number)=>n>0?'up':n<0?'down':'flat';
type Tab='home'|'watch'|'quote'|'order'|'balance';
const TABS:{id:Tab;label:string;off?:boolean}[]=[{id:'home',label:'홈'},{id:'watch',label:'관심'},{id:'quote',label:'현재가'},{id:'order',label:'주문',off:true},{id:'balance',label:'잔고'}];

function TabIcon({id}:{id:Tab}){
  const p={width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  if(id==='home')return <svg {...p}><path d="M4 11l8-6 8 6v8H4z"/><path d="M10 19v-5h4v5"/></svg>;
  if(id==='watch')return <svg {...p}><path d="M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.2 7 19l1.2-5.6L4 9.6 9.6 9z"/></svg>;
  if(id==='quote')return <svg {...p}><path d="M4 18l5-6 4 3 7-9"/></svg>;
  if(id==='order')return <svg {...p}><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6M9 13h6"/></svg>;
  return <svg {...p}><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16"/></svg>;
}

export type MtsMode='practice'|'broker';
export default function Mts({mode}:{mode:MtsMode}){
  const practice=mode==='practice';
  const lines=DEMO_ACCOUNT.holdings,std=useMemo(()=>lines.map(toStd),[lines]);
  const badges=useMemo(()=>badgesFor(std,DEMO_ACCOUNT.asOf),[std]);
  const [tab,setTab]=useState<Tab>('balance');
  const [view,setView]=useState<{focus:string|null}|null>(null);
  const [note,setNote]=useState<string|null>(null);
  const [sheet,setSheet]=useState<string|null>(null);
  const frame=useRef<HTMLIFrameElement>(null),sent=useRef(0);

  const buy=lines.reduce((a,l)=>a+l.avgPrice*l.quantity,0),now=lines.reduce((a,l)=>a+l.lastPrice*l.quantity,0);
  const pl=now-buy,plRate=buy>0?(now/buy-1)*100:0;

  // ReThink in the web view says it is ready; the balance goes back to that window only, same origin only
  useEffect(()=>{if(!view)return;
    const on=(e:MessageEvent)=>{const win=frame.current?.contentWindow;if(!win||e.source!==win||e.origin!==location.origin||!isReadyMsg(e.data))return;
      win.postMessage(holdingsMsg({source:'mts',broker:BROKER.name,holdings:std,focus:view.focus}),location.origin);sent.current++;
      (window as {__mts?:Record<string,unknown>}).__mts={...(window as {__mts?:Record<string,unknown>}).__mts,sent:sent.current,focus:view.focus}};
    window.addEventListener('message',on);return()=>window.removeEventListener('message',on)},[view,std]);
  useEffect(()=>{const w=window as {__mts?:Record<string,unknown>};w.__mts={...w.__mts,mode,sent:sent.current,badges:Object.keys(badges),open:!!view,sheet}},[badges,view,sheet,mode]);
  useEffect(()=>{if(!note)return;const t=setTimeout(()=>setNote(null),1800);return()=>clearTimeout(t)},[note]);

  const open=(focus:string|null)=>{setSheet(null);setView({focus})};
  const sheetLine=sheet?lines.find(l=>l.code===sheet)??null:null;
  const row=(l:DemoLine)=>{const r=rateOf(l),gain=(l.lastPrice-l.avgPrice)*l.quantity,day=l.lastPrice-l.prev,b=badges[l.code];
    return <li key={l.code} className="mts-row" data-code={l.code}>
      <button type="button" className="mts-row-btn" aria-label={`${l.name} 분석 보기`} onClick={()=>setSheet(l.code)}>
      <div className="mts-row-top">
        <div className="mts-name"><strong>{l.name}</strong><span className="mts-mkt">{l.market==='KOSPI'?'코스피':'코스닥'}</span></div>
        <span className={`mts-num ${tone(gain)}`}>{signed(gain)}</span>
        <span className={`mts-num mts-rate ${tone(r)}`}>{pct(r)}</span>
      </div>
      <div className="mts-row-bottom">
        <span>{won(l.quantity)}주</span><span>{won(l.avgPrice)}</span>
        <span className={tone(day)}>{won(l.lastPrice)} <small>{day>0?'▲':day<0?'▼':''}{won(Math.abs(day))}</small></span>
      </div>
      </button>
      {b&&<button type="button" className={`mts-badge m-${b.model}`} aria-label={`${l.name} ${b.label} · 분석 보기`} onClick={()=>setSheet(l.code)}>
        <span className="mts-badge-dot"/>{b.label}<span className="mts-badge-txt">{b.headline}</span><span className="mts-badge-go">›</span></button>}
    </li>};

  return <div className="mts-shell">
    <div className="mts-phone">
      <header className="mts-top">
        {practice?<div className="mts-brand"><span className="mts-mark rt" aria-hidden><i/><i/></span><span>ReThink</span><span className="mts-pill">연습 계좌</span></div>
          :<div className="mts-brand"><span className="mts-mark" aria-hidden><i/><i/></span><span>{BROKER.name}</span></div>}
        <div className="mts-top-r"><span className="mts-demo" role="note">{BROKER.demo}</span></div>
      </header>
      {tab==='balance'?<main className="mts-main" aria-label="잔고">
        <div className="mts-acct"><span>{DEMO_ACCOUNT.no}</span><span>{practice?'연습 계좌 · 가상 머니':DEMO_ACCOUNT.label}</span></div>
        <section className="mts-sum" aria-label="계좌 요약">
          <div className="mts-sum-k">총 평가금액</div>
          <div className="mts-sum-v">{won(now+DEMO_ACCOUNT.cash)}<small>원</small></div>
          <div className="mts-sum-grid">
            <div><span>평가손익</span><strong className={tone(pl)}>{signed(pl)}</strong></div>
            <div><span>수익률</span><strong className={tone(plRate)}>{pct(plRate)}</strong></div>
            <div><span>매입금액</span><strong>{won(buy)}</strong></div>
            <div><span>예수금</span><strong>{won(DEMO_ACCOUNT.cash)}</strong></div>
          </div>
        </section>
        <button type="button" className="mts-check" onClick={()=>open(null)}>
          <span className="mts-check-l"><strong>보유종목 점검</strong><small>{practice?`${lines.length}종목을 정원에서 한눈에`:`잔고 ${lines.length}종목이 그대로 넘어가요`} · 손실 신호 {Object.keys(badges).length}개</small></span>
          <span className="mts-check-by">{practice?'정원':'ReThink'}<span aria-hidden>›</span></span></button>
        <p className="mts-hint">종목을 누르면 회사 숫자와 주가 흐름을 바로 볼 수 있어요.</p>
        <div className="mts-head" aria-hidden>
          <div><span>종목명</span><span>평가손익</span><span>수익률</span></div>
          <div><span>보유수량</span><span>평균단가</span><span>현재가</span></div>
        </div>
        <ul className="mts-list" aria-label="보유 종목">{lines.map(row)}</ul>
        <p className="mts-foot">{BROKER.demo}입니다. {practice?'연습용 가상 머니 계좌이며':'실제 증권사·계좌가 아니며'} 시세·재무는 모의 값이고 주문 기능이 없습니다. 기준일 {DEMO_ACCOUNT.asOf}.</p>
      </main>:<main className="mts-main mts-empty" aria-label={TABS.find(t=>t.id===tab)!.label}>
        <p>데모에서는 잔고 화면만 있어요.</p><button type="button" className="mts-link" onClick={()=>setTab('balance')}>잔고로 가기</button></main>}
      <nav className="mts-tabs" aria-label="아래 메뉴">{TABS.map(t=><button key={t.id} type="button" className={tab===t.id?'on':''} aria-current={tab===t.id?'page':undefined}
        aria-disabled={t.off||undefined} onClick={()=>{if(t.off){setNote('데모에서는 주문할 수 없어요');return}setTab(t.id)}}><TabIcon id={t.id}/><span>{t.label}</span></button>)}</nav>
      {note&&<div className="mts-toast" role="status">{note}</div>}
      {sheetLine&&<StockSheet line={sheetLine} today={DEMO_ACCOUNT.asOf} more={practice?'정원에서 자세히':'리씽크에서 자세히'} onMore={()=>open(sheetLine.code)} onClose={()=>setSheet(null)}/>}
      {view&&<div className="mts-web" role="dialog" aria-label="보유종목 점검">
        <div className="mts-web-bar">
          <button type="button" className="mts-web-x" aria-label="닫기" onClick={()=>setView(null)}>‹</button>
          <div className="mts-web-t"><strong>보유종목 점검</strong><small>{practice?'ReThink 정원 · 연습 계좌 잔고':`ReThink · ${BROKER.name} 잔고 자동 연결`} · {BROKER.demo}</small></div>
        </div>
        <iframe ref={frame} className="mts-web-frame" title="ReThink" src="/?embed=mts"/>
      </div>}
    </div>
  </div>;
}
