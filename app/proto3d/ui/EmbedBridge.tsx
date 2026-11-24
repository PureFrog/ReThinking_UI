'use client';
// The hand-off inside the broker's web view (가상 MTS, feedback 2026-11-22 "호가창에서 갑자기 넘어가는 게 뜬금없다"):
// the web view opens on the broker's own white list, the same rows the player just saw (name, market, return in red/
// blue, the model badge), so it still feels like the MTS. One line says what happens next; then the panel slides away
// and the garden under it grows a tree per row. Times: core/timing.ts embedRow·embedHold·embedLift.
import {useEffect,useMemo} from 'react';
import {TIMING} from '../../core/timing';
import {rateOf,type StdHolding} from '../../core/holdings-in';
import type {Badge} from '../../content/broker/badges';
import {still} from '../still';

const pct=(n:number)=>`${n>0?'+':''}${n.toFixed(2)}%`;
const tone=(n:number)=>n>0?'up':n<0?'down':'flat';
// lines: null while the balance is on its way. onShown: every row is in and has been read a moment
export function EmbedBridge({lines,broker,focus,badges,lift,onShown,onGone}:{lines:StdHolding[]|null;broker?:string;focus?:string|null;badges:Record<string,Badge>;lift:boolean;onShown:()=>void;onGone:()=>void}){
  const quick=still();
  const order=useMemo(()=>lines?[...lines].sort((a,b)=>(b.code===focus?1:0)-(a.code===focus?1:0)):[],[lines,focus]);
  const flagged=order.filter(l=>badges[l.code]).length;
  useEffect(()=>{if(!lines)return;const t=setTimeout(onShown,quick?0:order.length*TIMING.embedRow+TIMING.embedHold);return()=>clearTimeout(t)},[lines]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!lift)return;const t=setTimeout(onGone,quick?0:TIMING.embedLift);return()=>clearTimeout(t)},[lift]);// eslint-disable-line react-hooks/exhaustive-deps
  return <div className={`rt-bridge${lift?' lift':''}`} role="dialog" aria-label="잔고 가져오기" style={{['--lift' as string]:`${TIMING.embedLift}ms`}}>
    <div className="rt-bridge-in">
      <div className="rt-bridge-k">{broker??'증권사'} 잔고 → ReThink</div>
      <h2 className="rt-bridge-t">{lines?`보유 ${lines.length}종목을 가져왔어요`:'잔고를 불러오는 중'}</h2>
      <ul className="rt-bridge-list" aria-label="가져온 종목">{order.map((l,i)=>{const r=rateOf(l),b=badges[l.code];
        return <li key={l.code} className={l.code===focus?'focus':''} style={{['--i' as string]:i,['--row' as string]:`${TIMING.embedRow}ms`}}>
          <span className="rt-bridge-name"><strong>{l.name}</strong><small>{l.market==='KOSPI'?'코스피':'코스닥'}</small></span>
          {b?<span className={`rt-bridge-badge m-${b.model}`}>{b.label}</span>:<span/>}
          <span className={`rt-bridge-rate ${tone(r)}`}>{pct(r)}</span>
        </li>})}</ul>
      {lines&&<p className="rt-bridge-note" style={{['--i' as string]:order.length,['--row' as string]:`${TIMING.embedRow}ms`}}>
        종목 하나가 나무 하나예요.{flagged?` 신호 있는 ${flagged}종목은 분석가가 먼저 봐요.`:''}</p>}
      <p className="rt-bridge-demo">가상 증권사 데모 화면 · 캡처나 입력 없이 잔고만 넘어와요</p>
    </div>
  </div>;
}
