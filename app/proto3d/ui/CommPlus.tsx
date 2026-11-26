'use client';
// 통신기 더하기 (피드백 2026-11-26 "실제 증권앱과 똑같이, 초보자 설명은 길게 누르거나 hover로, 쉽고 간결하게"):
//   Term        a word you can hold (or hover, or tap its dotted line) to get a one-line meaning (GLOSSARY)
//   CommGuide   the first time it opens: four cards (잔고 · 현재가 · 주문 · 길게 눌러 배우기); "?" in the header replays it
//   Spark       a tiny price line for a row
//   StockPage   a stock's page like a broker app's: price and change, a chart (1주 · 1달 · 3달), the day's numbers, a
//               five-level 호가 board, 매수 / 매도
//   Missions    why practise: four first steps with coin rewards (첫 매수, 뉴스 읽고 사기, 세 종목에 나눠 담기, 수익 실현)
//   Fields      the two fields in one line each: 기록 (my real stocks, the field) and 코인 (practice, the orchard)
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Bar} from '../../core/jigi/stocks';

export const GLOSSARY:Record<string,string>={
  '총 평가금액':'지금 가진 주식을 오늘 값으로 다 팔면 받을 돈 + 남은 코인이에요.',
  '평가손익':'산 값과 지금 값의 차이로 생긴 이익(+)이나 손해(−)예요. 아직 팔지 않았으니 "평가"예요.',
  '수익률':'산 돈에 비해 몇 % 벌었는지(또는 잃었는지)예요.',
  '매입금액':'주식을 사는 데 쓴 돈의 합이에요.',
  '보유수량':'지금 가지고 있는 주식 수예요.',
  '평균단가':'여러 번 나눠 샀다면, 한 주를 평균 얼마에 샀는지예요.',
  '현재가':'지금 이 주식 한 주의 값이에요. 연습 계좌는 전 거래일 종가를 써요.',
  '종가':'장이 끝날 때(오후 3시 30분) 마지막으로 거래된 값이에요.',
  '등락률':'어제 종가와 비교해 오늘 몇 % 올랐는지(빨강) 내렸는지(파랑)예요.',
  '매수':'주식을 사는 것이에요.',
  '매도':'주식을 파는 것이에요.',
  '시장가':'값을 정하지 않고 지금 거래되는 값으로 바로 사고파는 주문이에요.',
  '지정가':'"이 값이면 살게(팔게)" 하고 값을 정해 두는 주문이에요. 그 값이 와야 거래돼요.',
  '체결':'주문이 실제로 거래돼서 사고팔기가 끝난 것이에요.',
  '호가':'사려는 사람(매수)과 팔려는 사람(매도)이 부른 값과 수량이에요.',
  '거래량':'그날 사고팔린 주식 수예요. 많을수록 관심이 많다는 뜻이에요.',
  '고가':'그 기간에 가장 높았던 값이에요.',
  '저가':'그 기간에 가장 낮았던 값이에요.',
  '시가':'장이 시작할 때 첫 거래 값이에요.',
  '코스닥':'중소·벤처 기업이 많은 한국 주식 시장이에요.',
  '벤치마크':'내 성적을 견주는 기준이에요. 보통 시장 지수(코스닥 같은)를 써요. 펀드도 지수보다 잘했는지로 평가받아요.',
  '코스피':'큰 기업이 많은 한국의 대표 주식 시장이에요.',
  '분산 투자':'한 종목에 몰지 않고 여러 종목에 나눠 사서 위험을 줄이는 것이에요.',
  '수수료':'사고팔 때 증권사에 내는 작은 요금이에요. 연습 계좌는 0원이에요.',
  '예수금':'주식을 사는 데 쓸 수 있는 돈이에요. 여기선 코인이에요.',
};

// a word with its meaning: hover (mouse), hold 450ms (touch), or tap the dotted underline
export function Term({k,children}:{k:string;children?:React.ReactNode}){
  const [open,setOpen]=useState(false),ref=useRef<HTMLSpanElement>(null),hold=useRef<ReturnType<typeof setTimeout>|null>(null),[at,setAt]=useState({x:0,y:0,below:false});
  const show=()=>{const r=ref.current?.getBoundingClientRect();if(r)setAt({x:Math.min(innerWidth-130,Math.max(130,r.left+r.width/2)),y:r.top<120?r.bottom+8:r.top-8,below:r.top<120});setOpen(true)};
  useEffect(()=>{if(!open)return;const off=()=>setOpen(false);const t=setTimeout(()=>addEventListener('pointerdown',off,{once:true}),0);return()=>{clearTimeout(t);removeEventListener('pointerdown',off)}},[open]);
  const meaning=GLOSSARY[k];if(!meaning)return <>{children??k}</>;
  return <span ref={ref} className="rt-term" tabIndex={0} role="button" aria-label={`${k}: ${meaning}`}
    onMouseEnter={show} onMouseLeave={()=>setOpen(false)} onFocus={show} onBlur={()=>setOpen(false)}
    onPointerDown={e=>{if(e.pointerType!=='mouse'){hold.current=setTimeout(show,450)}}} onPointerUp={()=>{if(hold.current)clearTimeout(hold.current)}}
    onClick={e=>{e.stopPropagation();show()}} onContextMenu={e=>e.preventDefault()}>
    {children??k}
    {open&&<span className="rt-term-tip" role="tooltip" style={{left:at.x,top:at.y,transform:`translate(-50%,${at.below?'0':'-100%'})`}}><b>{k}</b>{meaning}</span>}
  </span>;
}

const GUIDE=[
  {icon:'💼',h:'잔고',t:'내가 가진 종목과 얼마 벌었는지 보는 곳이에요. 빨강은 +, 파랑은 −.'},
  {icon:'📈',h:'현재가',t:'오늘 살 수 있는 종목이에요. 누르면 차트와 호가를 볼 수 있어요.'},
  {icon:'🧾',h:'주문',t:'매수(사기)와 매도(팔기). 연습 계좌라 다음 장 마감 값으로 체결돼요.'},
  {icon:'👆',h:'모르는 단어는 길게 눌러요',t:'점선 밑줄 단어를 길게 누르거나(마우스는 올리면) 뜻이 나와요.'},
];
export function CommGuide({onDone}:{onDone:()=>void}){
  const [i,setI]=useState(0),g=GUIDE[i],last=i===GUIDE.length-1;
  return <div className="rt-cg" role="dialog" aria-label="모의투자 사용법">
    <div className="rt-cg-card"><div className="rt-cg-ic" aria-hidden>{g.icon}</div><b>{g.h}</b><p>{g.t}</p>
      <div className="rt-cg-dots">{GUIDE.map((_,k)=><i key={k} data-on={k===i}/>)}</div>
      <div className="rt-cg-acts"><button type="button" className="mts-link" onClick={onDone}>건너뛰기</button>
        <button type="button" className="rt-comm-go buy" onClick={()=>last?onDone():setI(i+1)}>{last?'시작하기':'다음'}</button></div></div>
  </div>;
}
// 첫 매수 카드 (피드백 B): right after the first practice buy, three cards on what just happened — 주가, 수익률, 분산 —
// with that stock's own numbers
export function FirstBuyCards({name,price,onDone}:{name:string;price:number;onDone:()=>void}){
  const up=Math.round(price*1.05/10)*10,down=Math.round(price*0.95/10)*10;
  const cards=[{icon:'🏷️',h:'주가',t:`${name} 1주를 ${won(price)}원에 샀어요. 주가는 장이 열린 동안 계속 바뀌고, 이 계좌는 매일 장 마감 값(종가)으로 바뀌어요.`},
    {icon:'📈',h:'수익률',t:`(지금 값 − 산 값) ÷ 산 값. ${won(price)}원이 ${won(up)}원이 되면 +5%, ${won(down)}원이 되면 −5%. 잔고 탭에서 매일 볼 수 있어요.`},
    {icon:'🧺',h:'분산',t:'한 종목에만 넣으면 그 회사 소식 하나에 계좌 전체가 흔들려요. 여러 종목으로 나누면 덜 흔들려요. 오락실 "분산 바구니"도 같은 얘기예요.'}];
  const [i,setI]=useState(0),c=cards[i],last=i===cards.length-1;
  return <div className="rt-cg" role="dialog" aria-label="첫 매수 설명">
    <div className="rt-cg-card"><small className="rt-fb-kick">첫 매수 축하해요!</small><div className="rt-cg-ic" aria-hidden>{c.icon}</div><b>{c.h}</b><p>{c.t}</p>
      <div className="rt-cg-dots">{cards.map((_,k)=><i key={k} data-on={k===i}/>)}</div>
      <div className="rt-cg-acts"><button type="button" className="mts-link" onClick={onDone}>닫기</button>
        <button type="button" className="rt-comm-go buy" onClick={()=>last?onDone():setI(i+1)}>{last?'알겠어요':'다음'}</button></div></div>
  </div>;
}
export const firstBuySeen=()=>{try{return !!localStorage.getItem('rethink-firstbuy')}catch{return true}};
export const markFirstBuy=()=>{try{localStorage.setItem('rethink-firstbuy','1')}catch{/* this visit */}};
export const guideSeen=()=>{try{return !!localStorage.getItem('rethink-comm-guide')}catch{return true}};
export const markGuide=()=>{try{localStorage.setItem('rethink-comm-guide','1')}catch{/* this visit */}};

export function Spark({bars,w=64,h=22}:{bars:Bar[];w?:number;h?:number}){
  if(bars.length<2)return null;const vs=bars.map(b=>b.c),lo=Math.min(...vs),hi=Math.max(...vs),r=hi-lo||1;
  const pts=vs.map((v,i)=>`${(i/(vs.length-1))*w},${h-((v-lo)/r)*h}`).join(' ');const up=vs[vs.length-1]>=vs[0];
  return <svg className="rt-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden><polyline points={pts} fill="none" stroke={up?'#e0493d':'#2f6fd6'} strokeWidth={1.6}/></svg>;
}

const won=(n:number)=>Math.round(n).toLocaleString('ko-KR');
const tick=(p:number)=>p<2000?1:p<5000?5:p<20000?10:p<50000?50:p<200000?100:p<500000?500:1000;
export function StockPage({name,mkt,bars,onBuy,onSell,canSell,onClose}:{name:string;mkt:string;bars:Bar[];onBuy:()=>void;onSell?:()=>void;canSell:boolean;onClose:()=>void}){
  const [span,setSpan]=useState<5|22|60>(22);
  const shown=bars.slice(-span),last=bars[bars.length-1],prev=bars[bars.length-2]??last;
  const rate=last&&prev?(last.c/prev.c-1)*100:0,up=rate>=0,cls=rate>0?'up':rate<0?'down':'flat';
  const hi=Math.max(...shown.map(b=>b.h??b.c)),lo=Math.min(...shown.map(b=>b.l??b.c));
  const chart=useMemo(()=>{if(shown.length<2)return null;const W=300,H=120,vs=shown.map(b=>b.c),mn=Math.min(...vs),mx=Math.max(...vs),r=mx-mn||1;
    const p=vs.map((v,i)=>[i/(vs.length-1)*W,H-6-((v-mn)/r)*(H-12)]);return {W,H,line:p.map(q=>q.join(',')).join(' '),area:`0,${H} ${p.map(q=>q.join(',')).join(' ')} ${W},${H}`}},[shown]);
  const book=useMemo(()=>{if(!last)return null;const t=tick(last.c);let s=last.c%97;const q=()=>{s=(s*7919+13)%997;return 50+s*3};
    return {ask:[5,4,3,2,1].map(k=>({p:last.c+k*t,q:q()})),bid:[0,1,2,3,4].map(k=>({p:last.c-k*t,q:q()}))}},[last]);
  if(!last)return null;
  return <div className="rt-sp" role="dialog" aria-label={`${name} 현재가`}>
    <header className="rt-sp-top"><button type="button" className="mts-link" onClick={onClose}>←</button><div><b>{name}</b><small><Term k={mkt==='KOSDAQ'?'코스닥':'코스피'}/></small></div><span/></header>
    <div className="rt-sp-price"><strong className={cls}>{won(last.c)}<small>원</small></strong>
      <span className={cls}>{up?'▲':'▼'} {won(Math.abs(last.c-prev.c))} ({rate>=0?'+':''}{rate.toFixed(2)}%) <Term k="등락률"><i className="rt-q">?</i></Term></span></div>
    <div className="rt-sp-spans" role="tablist">{([[5,'1주'],[22,'1달'],[60,'3달']] as const).map(([n,l])=><button key={n} type="button" role="tab" aria-selected={span===n} onClick={()=>setSpan(n)}>{l}</button>)}</div>
    {chart&&<svg className="rt-sp-chart" viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none" aria-label="주가 차트">
      <polygon points={chart.area} fill={up?'#e0493d22':'#2f6fd622'}/><polyline points={chart.line} fill="none" stroke={up?'#e0493d':'#2f6fd6'} strokeWidth={2}/></svg>}
    <dl className="rt-sp-stats">
      <div><dt><Term k="종가">전일 종가</Term></dt><dd>{won(prev.c)}</dd></div>
      <div><dt><Term k="시가"/></dt><dd>{won(last.o??last.c)}</dd></div>
      <div><dt><Term k="고가"/></dt><dd className="up">{won(hi)}</dd></div>
      <div><dt><Term k="저가"/></dt><dd className="down">{won(lo)}</dd></div>
      <div><dt><Term k="거래량"/></dt><dd>{last.v!=null?won(last.v):'-'}</dd></div>
      <div><dt><Term k="수수료"/></dt><dd>0원</dd></div>
    </dl>
    {book&&<section className="rt-sp-book" aria-label="호가"><h4><Term k="호가"/> <small>연습용 예시</small></h4>
      {book.ask.map(a=><div key={'a'+a.p} className="ask"><span>{won(a.q)}</span><b>{won(a.p)}</b><span/></div>)}
      {book.bid.map(b=><div key={'b'+b.p} className="bid" data-now={b.p===last.c}><span/><b>{won(b.p)}</b><span>{won(b.q)}</span></div>)}</section>}
    <div className="rt-sp-acts"><button type="button" className="rt-comm-go sell" disabled={!canSell} onClick={onSell}>매도</button><button type="button" className="rt-comm-go buy" onClick={onBuy}>매수</button></div>
  </div>;
}

export type Mission={id:string;label:string;done:boolean;coins:number;paid:boolean};
export function Missions({list,onClaim}:{list:Mission[];onClaim:(id:string)=>void}){
  const left=list.filter(m=>!m.paid);if(!left.length)return null;
  return <section className="rt-mis" aria-label="연습 미션"><h4>🎯 연습 미션 <small>해 보면 코인을 받아요</small></h4>
    {list.map(m=><div key={m.id} className="rt-mis-row" data-done={m.done} data-paid={m.paid}><span>{m.paid?'✅':m.done?'🎁':'⬜'} {m.label}</span>
      {m.paid?<small>받음</small>:m.done?<button type="button" className="rt-comm-go buy" onClick={()=>onClaim(m.id)}>+{won(m.coins)}</button>:<small>+{won(m.coins)}</small>}</div>)}
  </section>;
}
// 주간 챌린지 (core/weekly.ts): my practice account this week against the KOSDAQ index (벤치마크), a bar each
export type Weekly={mine:number;index:number;joined:boolean;beat:boolean;over:boolean;paid:boolean;real:boolean;medals:number;coins:{joined:number;beat:number}};
export function WeeklyCard({w,onClaim}:{w:Weekly;onClaim:()=>void}){
  const sg=(n:number)=>`${n>0?'+':''}${n.toFixed(2)}%`,top=Math.max(1,Math.abs(w.mine),Math.abs(w.index));
  const bar=(n:number,me:boolean)=><div className="rt-wk-bar"><span>{me?'내 연습 계좌':<>코스닥 <small>{w.real?'':'(예시)'}</small></>}</span>
    <div className="rt-wk-track"><i className={n>=0?'up':'down'} style={{width:`${Math.abs(n)/top*50}%`,[n>=0?'left':'right']:'50%'} as React.CSSProperties}/></div><b className={n>=0?'up':'down'}>{sg(n)}</b></div>;
  return <section className="rt-wk" aria-label="주간 챌린지"><h4>🏁 이번 주 챌린지 <small>코스닥(<Term k="벤치마크"/>)보다 잘했나?</small></h4>
    {w.joined?<>{bar(w.mine,true)}{bar(w.index,false)}
      <p className="rt-wk-say">{w.beat?'지금은 코스닥보다 앞서 있어요.':'지금은 코스닥보다 뒤에 있어요.'} {w.over?'':'금요일 장 마감 뒤에 결과가 나와요.'}</p>
      {w.over&&!w.paid&&<button type="button" className="rt-comm-go buy" onClick={onClaim}>결과 받기 · +{won(w.coins.joined)}{w.beat?' · 🏅':''}</button>}
      {w.paid&&<p className="rt-wk-say">이번 주 결과를 받았어요. 다음 주에 또 해요.</p>}</>
    :<p className="rt-wk-say">연습 종목을 1주라도 갖고 있으면 참가해요. 참가하면 +{won(w.coins.joined)}, 코스닥을 이기면 그 주에 🏅를 받아요.</p>}
    {w.medals>0&&<p className="rt-wk-say">지금까지 🏅 {w.medals}개</p>}
  </section>;
}
export function Fields(){
  return <div className="rt-fields"><div><span>🌳</span><p><b>기록</b> 내 진짜 종목. 마을의 <b>밭</b>에 있어요. 여기서 사고팔지 않아요.</p></div>
    <div><span>🍎</span><p><b>코인</b> 연습 종목. <b>과수원</b>에 자라요. 진짜 돈 없이 진짜 값으로 연습해요.</p></div></div>;
}
