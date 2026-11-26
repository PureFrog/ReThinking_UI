'use client';
// 피드백 2026-11-23: the coin calendar (the button beside my coins: what I earned each day, core/coinlog.ts) and the coin
// payment window (코인 결제창). The payment is the screens only — nothing is charged and no coins are given; a real
// payment is wired in at pay() below.
import {useState} from 'react';
import {Sheet} from './Sheet';
import {Coin} from './Build';
import {monthGrid,monthTotal,shiftMonth,COIN_PACKS,PAY_METHODS,type CoinLog} from '../../core/coinlog';
import {won,wonShort} from '../../core/won';

const WEEK=['일','월','화','수','목','금','토'];
export function CoinCalendar({log,today,coins,onClose,onPay}:{log:CoinLog|undefined;today:string;coins:number;onClose:()=>void;onPay:()=>void}){
  const [month,setMonth]=useState(today.slice(0,7));
  const grid=monthGrid(month),total=monthTotal(log,month),[y,m]=month.split('-');
  return <Sheet kicker="코인 · 달력" title="날마다 모은 코인" label="코인 달력" onClose={onClose}
    foot={<button type="button" className="rt-btn primary cc-pay" onClick={onPay}>코인 충전하기</button>}>
    <div className="cc-now"><span>지금 가진 코인</span><b><Coin/>{wonShort(coins)}</b></div>
    <div className="cc-head">
      <button type="button" className="rt-btn ghost cc-nav" aria-label="이전 달" onClick={()=>setMonth(shiftMonth(month,-1))}>‹</button>
      <h3 key={month}>{y}년 {Number(m)}월</h3>
      <button type="button" className="rt-btn ghost cc-nav" aria-label="다음 달" disabled={month>=today.slice(0,7)} onClick={()=>setMonth(shiftMonth(month,1))}>›</button>
    </div>
    <table className="cc-grid" key={month} aria-label={`${y}년 ${Number(m)}월 코인`}>
      <thead><tr>{WEEK.map(w=><th key={w} scope="col">{w}</th>)}</tr></thead>
      <tbody>{grid.map((w,i)=><tr key={i}>{w.map((d,j)=>{const n=d?log?.[d]??0:0;
        return <td key={j} data-day={d??undefined} data-today={d===today} data-got={n>0} data-future={!!d&&d>today}>
          {d&&<><span className="cc-d">{Number(d.slice(8))}</span>{n>0&&<span className="cc-n" aria-label={`${won(n)} 획득`}>+{short(n)}</span>}</>}</td>})}</tr>)}</tbody>
    </table>
    <p className="cc-total">{Number(m)}월에 모은 코인 <b>+{won(total)}</b></p>
    <p className="rt-hint">퀴즈, 일지, 낚시, 수레 정산처럼 코인이 들어온 날 그날 모은 만큼 적혀요. 쓴 코인은 빼지 않아요.</p>
  </Sheet>;
}
// a calendar cell is small: 13,000 → 1.3만, 300,000 → 30만
function short(n:number){if(n>=10000){const v=n/10000;return (v>=100?Math.round(v):Math.round(v*10)/10)+'만'}return n.toLocaleString('ko-KR')}

type Step='pick'|'pay'|'done';
export function CoinPay({coins,onClose}:{coins:number;onClose:()=>void}){
  const [step,setStep]=useState<Step>('pick');
  const [pack,setPack]=useState(COIN_PACKS[1].id);
  const [method,setMethod]=useState<string>(PAY_METHODS[0].id);
  const [agree,setAgree]=useState(false);
  const p=COIN_PACKS.find(x=>x.id===pack)!;
  // the real payment goes here; until then the window ends on a notice and nothing changes
  const pay=()=>setStep('done');
  return <Sheet kicker="코인 · 결제" title={step==='pick'?'코인 충전':step==='pay'?'결제하기':'결제 안내'} label="코인 결제창" onClose={onClose}
    foot={step==='pick'?<button type="button" className="rt-btn primary cp-next" disabled>결제는 준비 중이에요</button>/* 2026-11-25: payment is not connected yet, so the window stops here (no fake pay step) */
      :step==='pay'?<><button type="button" className="rt-btn ghost" onClick={()=>setStep('pick')}>이전</button>
        <button type="button" className="rt-btn primary cp-pay" disabled={!agree} onClick={pay}>{won(p.price)} 결제하기</button></>
      :<button type="button" className="rt-btn primary" onClick={onClose}>닫기</button>}>
    <div className="cp-step" key={step}>
    {step==='pick'&&<>
      <div className="cc-now"><span>지금 가진 코인</span><b><Coin/>{wonShort(coins)}</b></div>
      <p className="rt-hint cp-soon" role="status">코인 충전은 준비 중이에요. 지금은 퀴즈, 일지, 낚시, 퀘스트로 코인을 모을 수 있어요.</p>
      <ul className="cp-packs" role="radiogroup" aria-label="충전할 코인">{COIN_PACKS.map(x=><li key={x.id}>
        <button type="button" role="radio" aria-checked={x.id===pack} className="cp-pack" data-on={x.id===pack} onClick={()=>setPack(x.id)}>
          {x.tag&&<em>{x.tag}</em>}<b><Coin/>{wonShort(x.coins)}</b>{x.bonus>0&&<small>+보너스 {wonShort(x.bonus)}</small>}<span className="cp-price">{won(x.price)}</span></button></li>)}</ul>
    </>}
    {step==='pay'&&<>
      <dl className="cp-sum"><div><dt>충전 코인</dt><dd>{wonShort(p.coins)}{p.bonus>0&&` + 보너스 ${wonShort(p.bonus)}`}</dd></div>
        <div><dt>충전 후</dt><dd>{wonShort(coins+p.coins+p.bonus)}</dd></div><div><dt>결제 금액</dt><dd><b>{won(p.price)}</b></dd></div></dl>
      <fieldset className="cp-methods"><legend>결제 수단</legend>{PAY_METHODS.map(x=><label key={x.id} className="cp-method" data-on={x.id===method}>
        <input type="radio" name="cp-method" checked={x.id===method} onChange={()=>setMethod(x.id)}/>{x.label}</label>)}</fieldset>
      <label className="rt-row cp-agree"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/>결제 내용을 확인했고 이용 약관에 동의해요</label>
    </>}
    {step==='done'&&<div className="cp-done"><p className="cp-big">아직 결제가 연결되지 않았어요</p>
      <p>지금은 화면만 있는 미리보기라, 돈이 나가지 않았고 코인도 들어오지 않았어요. 결제가 붙으면 이 단계에서 {wonShort(p.coins+p.bonus)} 코인이 충전돼요.</p></div>}
    </div>
  </Sheet>;
}
